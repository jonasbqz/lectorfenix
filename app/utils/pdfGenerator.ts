import { logger } from "./logger";
import { jsPDF } from "jspdf";
import { pdfCache } from "./pdfCache";

export const generateMangaPDF = async (
  title: string,
  chapterNumber: string | number,
  images: string[],
  onProgress?: (percent: number) => void
) => {
  const sanitizedImages = sanitizePdfImages(images);

  if (sanitizedImages.length === 0) {
    throw new Error("No valid manga page images available to generate the PDF.");
  }

  const chapters = [{ number: chapterNumber, images: sanitizedImages }];
  const cached = await pdfCache.get(chapters, "high");

  if (cached) {
    logger.debug("PDF recuperado del cache instantaneamente");
    onProgress?.(100);
    downloadBlob(cached.blob, cached.filename);
    return;
  }

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  let addedPages = 0;

  for (let i = 0; i < sanitizedImages.length; i += 1) {
    onProgress?.(Math.round(((i + 1) / sanitizedImages.length) * 100));

    let image: { dataUrl: string; width: number; height: number };

    try {
      image = await getImageData(sanitizedImages[i]);
    } catch (error) {
      logger.warn("Skipped unreadable image while generating PDF.", error);
      continue;
    }

    if (isMangaDexPlaceholderImage(sanitizedImages[i], image.width, image.height)) {
      logger.warn("Skipped MangaDex placeholder image while generating PDF.");
      continue;
    }

    const imgProps = pdf.getImageProperties(image.dataUrl);
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    if (addedPages > 0) pdf.addPage([pdfWidth, pdfHeight], "p");
    pdf.addImage(image.dataUrl, "JPEG", 0, 0, pdfWidth, pdfHeight);
    addedPages += 1;
  }

  if (addedPages === 0) {
    throw new Error("No valid manga page images available to generate the PDF.");
  }

  const filename = `${sanitizeFilename(title)}_Cap_${sanitizeFilename(String(chapterNumber))}.pdf`;
  const pdfBlob = pdf.output("blob");

  await pdfCache.set(chapters, "high", pdfBlob, filename);
  downloadBlob(pdfBlob, filename);
};

const BLOCKED_IMAGE_KEYWORDS = [
  "banner",
  "logo",
  "advertisement",
  "advert",
  "ads",
  "watermark",
  "tracking",
  "pixel",
  "placeholder",
];

function sanitizePdfImages(images: string[]) {
  const validImages = images
    .filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    .map((image) => image.trim());

  const filteredImages = validImages
    .map((image) => normalizePdfImageUrl(image))
    .filter((image) => {
      const normalizedImage = normalizeImageUrlForFiltering(image);
      const isMangaDexPage = normalizedImage.includes("uploads.mangadex.org/data/");

      if (normalizedImage.includes("mangadex.org") && !isMangaDexPage) {
        return false;
      }

      return !BLOCKED_IMAGE_KEYWORDS.some((keyword) => normalizedImage.includes(keyword));
    });

  if (filteredImages.length === 0 && validImages.length > 0) {
    logger.warn("PDF image filter removed every URL; using original page URLs as a safe fallback.");
    return validImages;
  }

  return filteredImages;
}

function normalizePdfImageUrl(image: string) {
  const originalImage = getOriginalImageUrl(image);

  if (originalImage.toLowerCase().includes("uploads.mangadex.org/data/")) {
    return originalImage;
  }

  return image;
}

function normalizeImageUrlForFiltering(image: string) {
  return getOriginalImageUrl(image).toLowerCase();
}

function getOriginalImageUrl(image: string) {
  try {
    const imageUrl = new URL(image, window.location.origin);
    const proxiedUrl = imageUrl.searchParams.get("url");
    return decodeURIComponent(proxiedUrl ?? image);
  } catch {
    try {
      return decodeURIComponent(image);
    } catch {
      return image;
    }
  }
}

function isMangaDexPlaceholderImage(url: string, width: number, height: number) {
  return getOriginalImageUrl(url).toLowerCase().includes("mangadex.org") && width === 600 && height === 642;
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "_") || "lectorfenix";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MAX_IMAGE_LOAD_ATTEMPTS = 3;

async function getImageData(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const sources = getPdfImageSources(url);
  let lastError: unknown = null;

  for (const source of sources) {
    for (let attempt = 0; attempt < MAX_IMAGE_LOAD_ATTEMPTS; attempt += 1) {
      try {
        return await loadImageData(addRetryParam(source, attempt));
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Image could not be loaded for PDF.");
}

const loadImageData = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas context unavailable."));
        return;
      }

      try {
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.8),
          width: img.width,
          height: img.height,
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Image canvas conversion failed."));
      }
    };
    img.onerror = () => reject(new Error(`Image failed to load: ${url}`));
    img.src = url;
  });
};

function getPdfImageSources(url: string) {
  const originalUrl = getOriginalImageUrl(url);

  if (originalUrl.toLowerCase().includes("uploads.mangadex.org/data/")) {
    return [
      originalUrl,
      originalUrl.replace("/data/", "/data-saver/"),
    ];
  }

  return [
    url.startsWith("/api/proxy-image")
      ? url
      : `/api/proxy-image?url=${encodeURIComponent(url)}`,
  ];
}

function addRetryParam(url: string, attempt: number) {
  if (attempt === 0) {
    return url;
  }

  try {
    const retryUrl = new URL(url, window.location.origin);
    retryUrl.searchParams.set("pdf_retry", String(attempt));
    return retryUrl.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}pdf_retry=${attempt}`;
  }
}
