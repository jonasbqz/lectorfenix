import type { SupportedLanguage } from "../components/language-provider";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalPageKey = "terminos" | "privacidad" | "dmca";

export const legalContent: Record<LegalPageKey, Record<SupportedLanguage, LegalSection[]>> = {
  terminos: {
    es: [
      {
        title: "Aceptación de los términos",
        paragraphs: [
          "Al acceder o utilizar MangaStoon, aceptas estos Términos de Servicio y cualquier política complementaria publicada en la plataforma. Si no estás de acuerdo con alguna parte de estos términos, debes dejar de utilizar el sitio.",
          "MangaStoon puede actualizar estos términos para reflejar cambios técnicos, legales o de funcionamiento. El uso continuado de la plataforma después de una actualización implica la aceptación de la versión vigente.",
        ],
      },
      {
        title: "Uso permitido de la plataforma",
        paragraphs: [
          "MangaStoon se ofrece como una interfaz de exploración, indexación y lectura basada en fuentes externas. El usuario se compromete a utilizar el servicio de manera personal, razonable y conforme a la ley.",
          "No está permitido intentar sobrecargar, automatizar, extraer masivamente, interferir, vulnerar o degradar la disponibilidad de la plataforma, sus rutas, sus integraciones o sus proveedores externos.",
        ],
      },
      {
        title: "Mayoría de edad y contenido explícito",
        paragraphs: [
          "Algunas categorías pueden incluir contenido sugerente, erótico o explícito según la clasificación proporcionada por servicios externos. El acceso a contenido marcado como +18 está reservado estrictamente a usuarios mayores de edad en su jurisdicción.",
          "El usuario declara que tiene la edad legal necesaria para activar o visualizar contenido adulto. MangaStoon no se responsabiliza por declaraciones falsas realizadas por el usuario ni por el uso de la plataforma en contra de restricciones locales.",
        ],
      },
      {
        title: "Propiedad intelectual",
        paragraphs: [
          "MangaStoon no reclama propiedad sobre mangas, manhwas, cómics, portadas, capítulos, traducciones, imágenes o marcas pertenecientes a sus respectivos titulares. Todos los derechos pertenecen a sus propietarios.",
          "Las marcas, nombres de obras y materiales referenciados aparecen únicamente con fines de indexación, identificación, búsqueda y acceso a información pública proporcionada por terceros.",
        ],
      },
      {
        title: "Disponibilidad y cambios continuos",
        paragraphs: [
          "La plataforma puede cambiar, interrumpirse, fallar temporalmente o dejar de mostrar ciertos resultados debido a mantenimientos, límites de API, cambios de proveedores externos, errores de red o decisiones técnicas.",
          "MangaStoon no garantiza disponibilidad continua, exactitud permanente de metadatos, presencia de capítulos específicos ni continuidad de enlaces externos.",
        ],
      },
      {
        title: "Limitación de responsabilidad y ley aplicable",
        paragraphs: [
          "MangaStoon se proporciona tal como está, sin garantías expresas o implícitas. En la máxima medida permitida por la ley, no seremos responsables por daños indirectos, pérdida de datos, interrupciones, errores de terceros o decisiones tomadas por el usuario con base en contenido externo.",
          "Cualquier disputa se interpretará conforme a la normativa aplicable al operador del servicio, sin perjuicio de derechos irrenunciables que puedan corresponder al usuario bajo su legislación local.",
        ],
      },
    ],
    en: [
      {
        title: "Acceptance of terms",
        paragraphs: [
          "By accessing or using MangaStoon, you agree to these Terms of Service and any related policies published on the platform. If you do not agree with any part of these terms, you should stop using the service.",
          "MangaStoon may update these terms to reflect technical, legal, or operational changes. Continued use of the platform after an update means you accept the current version.",
        ],
      },
      {
        title: "Permitted use",
        paragraphs: [
          "MangaStoon is provided as an exploration, indexing, and reading interface based on external sources. You agree to use the service in a personal, reasonable, and lawful manner.",
          "You may not overload, automate, mass scrape, interfere with, bypass, compromise, or degrade the platform, its routes, integrations, or external providers.",
        ],
      },
      {
        title: "Age requirement and explicit content",
        paragraphs: [
          "Some categories may include suggestive, erotic, or explicit material according to classifications supplied by external services. Access to +18 content is strictly reserved for users who are legally adults in their jurisdiction.",
          "You represent that you are legally allowed to activate or view adult content. MangaStoon is not responsible for false age representations or for use of the platform against local restrictions.",
        ],
      },
      {
        title: "Intellectual property",
        paragraphs: [
          "MangaStoon does not claim ownership over manga, manhwa, comics, covers, chapters, translations, images, or trademarks belonging to their respective owners. All rights remain with their holders.",
          "Works, names, brands, and referenced materials appear only for indexing, identification, search, and access to public information supplied by third parties.",
        ],
      },
      {
        title: "Availability and continuous changes",
        paragraphs: [
          "The platform may change, become unavailable, fail temporarily, or stop showing certain results due to maintenance, API limits, third-party changes, network errors, or technical decisions.",
          "MangaStoon does not guarantee continuous availability, permanent metadata accuracy, presence of specific chapters, or continuity of external links.",
        ],
      },
      {
        title: "Limitation of liability and governing law",
        paragraphs: [
          "MangaStoon is provided as is, without express or implied warranties. To the maximum extent allowed by law, we are not liable for indirect damages, data loss, interruptions, third-party errors, or decisions made by users based on external content.",
          "Any dispute will be interpreted under the law applicable to the service operator, without limiting mandatory rights that users may have under local law.",
        ],
      },
    ],
    pt: [
      {
        title: "Aceitação dos termos",
        paragraphs: [
          "Ao acessar ou usar o MangaStoon, você aceita estes Termos de Serviço e quaisquer políticas complementares publicadas na plataforma. Se não concordar com alguma parte destes termos, deve deixar de utilizar o site.",
          "O MangaStoon pode atualizar estes termos para refletir mudanças técnicas, legais ou operacionais. O uso contínuo da plataforma após uma atualização implica aceitação da versão vigente.",
        ],
      },
      {
        title: "Uso permitido",
        paragraphs: [
          "O MangaStoon é oferecido como uma interface de exploração, indexação e leitura baseada em fontes externas. O usuário se compromete a utilizar o serviço de forma pessoal, razoável e conforme a lei.",
          "Não é permitido sobrecarregar, automatizar, extrair em massa, interferir, burlar, comprometer ou degradar a plataforma, suas rotas, integrações ou provedores externos.",
        ],
      },
      {
        title: "Maioridade e conteúdo explícito",
        paragraphs: [
          "Algumas categorias podem incluir conteúdo sugestivo, erótico ou explícito de acordo com classificações fornecidas por serviços externos. O acesso a conteúdo +18 é estritamente reservado a usuários maiores de idade em sua jurisdição.",
          "O usuário declara possuir idade legal para ativar ou visualizar conteúdo adulto. O MangaStoon não se responsabiliza por declarações falsas nem pelo uso da plataforma contra restrições locais.",
        ],
      },
      {
        title: "Propriedade intelectual",
        paragraphs: [
          "O MangaStoon não reivindica propriedade sobre mangás, manhwas, quadrinhos, capas, capítulos, traduções, imagens ou marcas pertencentes aos respectivos titulares. Todos os direitos permanecem com seus proprietários.",
          "Obras, nomes, marcas e materiais referenciados aparecem apenas para indexação, identificação, busca e acesso a informações públicas fornecidas por terceiros.",
        ],
      },
      {
        title: "Disponibilidade e mudanças contínuas",
        paragraphs: [
          "A plataforma pode mudar, ficar indisponível, falhar temporariamente ou deixar de mostrar certos resultados por manutenção, limites de API, mudanças de terceiros, erros de rede ou decisões técnicas.",
          "O MangaStoon não garante disponibilidade contínua, exatidão permanente de metadados, presença de capítulos específicos ou continuidade de links externos.",
        ],
      },
      {
        title: "Limitação de responsabilidade e lei aplicável",
        paragraphs: [
          "O MangaStoon é fornecido no estado em que se encontra, sem garantias expressas ou implícitas. Na máxima extensão permitida por lei, não seremos responsáveis por danos indiretos, perda de dados, interrupções, erros de terceiros ou decisões tomadas com base em conteúdo externo.",
          "Qualquer disputa será interpretada conforme a legislação aplicável ao operador do serviço, sem prejuízo de direitos obrigatórios que possam corresponder ao usuário em sua lei local.",
        ],
      },
    ],
  },
  privacidad: {
    es: [
      {
        title: "Datos que no recopilamos",
        paragraphs: [
          "MangaStoon no recopila información personal identificable sensible, como documentos oficiales, direcciones físicas, datos bancarios, contraseñas externas o información de pago.",
          "La plataforma puede utilizar datos técnicos mínimos necesarios para operar correctamente, como preferencias guardadas en el navegador, estado de sesión local o configuración visual.",
        ],
      },
      {
        title: "Cookies técnicas y almacenamiento local",
        paragraphs: [
          "Podemos utilizar cookies técnicas o de sesión para recordar preferencias como idioma, modo de contenido adulto o ajustes básicos de navegación. Estas cookies no están diseñadas para vender datos ni perfilar comercialmente al usuario.",
          "También podemos usar LocalStorage para preferencias locales como favoritos, historial de lectura, idioma, filtros o configuraciones de interfaz. Estos datos permanecen en el navegador del usuario y pueden eliminarse limpiando los datos del sitio.",
        ],
      },
      {
        title: "Analíticas básicas",
        paragraphs: [
          "Si se implementan analíticas, se utilizarán de forma agregada para entender rendimiento, errores, rutas más usadas y estabilidad general del servicio.",
          "No vendemos información personal a terceros. Tampoco utilizamos datos sensibles para publicidad comportamental dentro de MangaStoon.",
        ],
      },
      {
        title: "Enlaces y servicios externos",
        paragraphs: [
          "MangaStoon depende de APIs y servicios externos, incluyendo MangaDex, para mostrar metadatos, portadas, capítulos y recursos de lectura. Al interactuar con esos servicios, pueden aplicar sus propias políticas de privacidad.",
          "No controlamos las prácticas de recopilación, almacenamiento o tratamiento de datos de sitios externos enlazados o consumidos mediante APIs públicas.",
        ],
      },
      {
        title: "Seguridad y cambios",
        paragraphs: [
          "Aplicamos medidas razonables para reducir riesgos técnicos, pero ningún servicio conectado a internet puede garantizar seguridad absoluta.",
          "Esta política puede actualizarse cuando cambien las funciones de la plataforma, las obligaciones legales o las integraciones técnicas.",
        ],
      },
    ],
    en: [
      {
        title: "Data we do not collect",
        paragraphs: [
          "MangaStoon does not collect sensitive personally identifiable information such as government IDs, physical addresses, banking data, external passwords, or payment information.",
          "The platform may use minimal technical data required to operate properly, such as browser-stored preferences, local session state, or visual settings.",
        ],
      },
      {
        title: "Technical cookies and local storage",
        paragraphs: [
          "We may use technical or session cookies to remember preferences such as language, adult-content mode, or basic navigation settings. These cookies are not intended to sell data or commercially profile users.",
          "We may also use LocalStorage for local preferences such as favorites, reading history, language, filters, or interface settings. This data remains in the user's browser and can be removed by clearing site data.",
        ],
      },
      {
        title: "Basic analytics",
        paragraphs: [
          "If analytics are implemented, they will be used in aggregate to understand performance, errors, common routes, and overall service stability.",
          "We do not sell personal information to third parties. We also do not use sensitive data for behavioral advertising inside MangaStoon.",
        ],
      },
      {
        title: "External links and services",
        paragraphs: [
          "MangaStoon relies on external APIs and services, including MangaDex, to display metadata, covers, chapters, and reading resources. Those services may apply their own privacy policies.",
          "We do not control the data collection, storage, or processing practices of external websites linked from or consumed through public APIs.",
        ],
      },
      {
        title: "Security and changes",
        paragraphs: [
          "We apply reasonable measures to reduce technical risks, but no internet-connected service can guarantee absolute security.",
          "This policy may be updated when platform features, legal obligations, or technical integrations change.",
        ],
      },
    ],
    pt: [
      {
        title: "Dados que não coletamos",
        paragraphs: [
          "O MangaStoon não coleta informações pessoais identificáveis sensíveis, como documentos oficiais, endereços físicos, dados bancários, senhas externas ou informações de pagamento.",
          "A plataforma pode usar dados técnicos mínimos necessários para funcionar corretamente, como preferências salvas no navegador, estado de sessão local ou configurações visuais.",
        ],
      },
      {
        title: "Cookies técnicos e armazenamento local",
        paragraphs: [
          "Podemos usar cookies técnicos ou de sessão para lembrar preferências como idioma, modo de conteúdo adulto ou ajustes básicos de navegação. Esses cookies não são destinados à venda de dados nem ao perfilamento comercial do usuário.",
          "Também podemos usar LocalStorage para preferências locais como favoritos, histórico de leitura, idioma, filtros ou configurações de interface. Esses dados permanecem no navegador do usuário e podem ser removidos ao limpar os dados do site.",
        ],
      },
      {
        title: "Analíticas básicas",
        paragraphs: [
          "Se forem implementadas analíticas, elas serão usadas de forma agregada para entender desempenho, erros, rotas mais usadas e estabilidade geral do serviço.",
          "Não vendemos informações pessoais a terceiros. Também não usamos dados sensíveis para publicidade comportamental dentro do MangaStoon.",
        ],
      },
      {
        title: "Links e serviços externos",
        paragraphs: [
          "O MangaStoon depende de APIs e serviços externos, incluindo MangaDex, para exibir metadados, capas, capítulos e recursos de leitura. Esses serviços podem aplicar suas próprias políticas de privacidade.",
          "Não controlamos as práticas de coleta, armazenamento ou tratamento de dados de sites externos vinculados ou consumidos por APIs públicas.",
        ],
      },
      {
        title: "Segurança e mudanças",
        paragraphs: [
          "Aplicamos medidas razoáveis para reduzir riscos técnicos, mas nenhum serviço conectado à internet pode garantir segurança absoluta.",
          "Esta política pode ser atualizada quando mudarem as funções da plataforma, obrigações legais ou integrações técnicas.",
        ],
      },
    ],
  },
  dmca: {
    es: [
      {
        title: "Naturaleza del servicio",
        paragraphs: [
          "MangaStoon es un proveedor de servicios de agregación, indexación y visualización de enlaces. No alojamos, subimos, copiamos, almacenamos ni distribuimos archivos de imagen, manga, manhwa, cómic o capítulo en nuestros propios servidores.",
          "La información mostrada se obtiene en tiempo real a través de APIs públicas, incluyendo MangaDex, y otros servicios externos cuando corresponda.",
        ],
      },
      {
        title: "Contenido de terceros",
        paragraphs: [
          "MangaStoon no controla los archivos originales ni tiene capacidad directa para eliminar obras alojadas por terceros. Portadas, páginas, capítulos y metadatos pertenecen a sus respectivos titulares o a las fuentes que los publican.",
          "Si considera que una obra infringe sus derechos, debe dirigir la reclamación principal al servicio que aloja o distribuye los archivos originales.",
        ],
      },
      {
        title: "Solicitudes de bloqueo de indexación local",
        paragraphs: [
          "Aunque no alojamos contenido, podemos revisar solicitudes razonables para limitar la visibilidad de una referencia dentro de MangaStoon. Para ello, escriba a legal@mangastoon.com con identificación de la obra, URLs afectadas, prueba de titularidad y una declaración de buena fe.",
          "Una solicitud de bloqueo local no elimina el contenido de MangaDex ni de ninguna fuente externa. Solo puede afectar la forma en que MangaStoon indexa o presenta esa referencia.",
        ],
      },
      {
        title: "Reclamaciones DMCA o equivalentes",
        paragraphs: [
          "Las reclamaciones de eliminación, takedown o infracción deben enviarse a la fuente original que aloja los archivos. Si el contenido proviene de MangaDex, consulte los canales oficiales de MangaDex para reclamaciones de copyright.",
          "MangaStoon coopera de buena fe con titulares de derechos, pero su rol técnico es el de agregador e índice, no el de host de archivos.",
        ],
      },
    ],
    en: [
      {
        title: "Nature of the service",
        paragraphs: [
          "MangaStoon is an aggregation, indexing, and link-display service provider. We do not host, upload, copy, store, or distribute image files, manga, manhwa, comics, or chapters on our own servers.",
          "The information displayed is obtained in real time through public APIs, including MangaDex, and other external services where applicable.",
        ],
      },
      {
        title: "Third-party content",
        paragraphs: [
          "MangaStoon does not control original files and cannot directly remove works hosted by third parties. Covers, pages, chapters, and metadata belong to their respective owners or to the sources that publish them.",
          "If you believe a work infringes your rights, your primary claim should be sent to the service that hosts or distributes the original files.",
        ],
      },
      {
        title: "Local indexing block requests",
        paragraphs: [
          "Although we do not host content, we may review reasonable requests to limit the visibility of a reference inside MangaStoon. Please contact legal@mangastoon.com with work identification, affected URLs, proof of ownership, and a good-faith statement.",
          "A local indexing block request does not remove content from MangaDex or any external source. It may only affect how MangaStoon indexes or displays that reference.",
        ],
      },
      {
        title: "DMCA or equivalent claims",
        paragraphs: [
          "Removal, takedown, or infringement claims must be sent to the original source hosting the files. If the content comes from MangaDex, please use MangaDex's official copyright channels.",
          "MangaStoon cooperates in good faith with rights holders, but its technical role is that of an aggregator and index, not a file host.",
        ],
      },
    ],
    pt: [
      {
        title: "Natureza do serviço",
        paragraphs: [
          "O MangaStoon é um provedor de serviços de agregação, indexação e exibição de links. Não hospedamos, enviamos, copiamos, armazenamos nem distribuímos arquivos de imagem, mangá, manhwa, quadrinho ou capítulo em nossos próprios servidores.",
          "As informações exibidas são obtidas em tempo real por meio de APIs públicas, incluindo MangaDex, e outros serviços externos quando aplicável.",
        ],
      },
      {
        title: "Conteúdo de terceiros",
        paragraphs: [
          "O MangaStoon não controla os arquivos originais e não tem capacidade direta para remover obras hospedadas por terceiros. Capas, páginas, capítulos e metadados pertencem aos seus respectivos titulares ou às fontes que os publicam.",
          "Se acredita que uma obra viola seus direitos, a reclamação principal deve ser enviada ao serviço que hospeda ou distribui os arquivos originais.",
        ],
      },
      {
        title: "Solicitações de bloqueio de indexação local",
        paragraphs: [
          "Embora não hospedemos conteúdo, podemos revisar solicitações razoáveis para limitar a visibilidade de uma referência dentro do MangaStoon. Entre em contato por legal@mangastoon.com com identificação da obra, URLs afetadas, prova de titularidade e declaração de boa-fé.",
          "Uma solicitação de bloqueio local não remove conteúdo do MangaDex nem de qualquer fonte externa. Ela pode afetar apenas a forma como o MangaStoon indexa ou exibe essa referência.",
        ],
      },
      {
        title: "Reclamações DMCA ou equivalentes",
        paragraphs: [
          "Reclamações de remoção, takedown ou infração devem ser enviadas à fonte original que hospeda os arquivos. Se o conteúdo vier do MangaDex, utilize os canais oficiais de copyright do MangaDex.",
          "O MangaStoon coopera de boa-fé com titulares de direitos, mas seu papel técnico é o de agregador e índice, não de hospedeiro de arquivos.",
        ],
      },
    ],
  },
};
