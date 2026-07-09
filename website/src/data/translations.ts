export interface TranslationSet {
  hero: {
    badgeLocalFirst: string;
    badgeMarkdownTruth: string;
    badgeHumanApproved: string;
    badgeCrossAgent: string;
    badgeMcpReady: string;
    title: string;
    subtitle: string;
    btnGetStarted: string;
    btnViewGitHub: string;
  };
  problems: {
    tag: string;
    heading: string;
    pain: string;
    items: { title: string; desc: string }[];
  };
  solutions: {
    tag: string;
    heading: string;
    subheading: string;
    items: { title: string; desc: string }[];
  };
  workflow: {
    tag: string;
    heading: string;
    steps: { title: string; desc: string }[];
    mockOutput: string;
    mockPrompt: string;
  };
  entryUi: {
    tag: string;
    heading: string;
    subheading: string;
    items: { title: string; desc: string }[];
    cline: string;
    gemini: string;
    cursor: string;
    connected: string;
    active: string;
    threshold: string;
    gitAutoCommit: string;
    duplicateDetected: string;
    duplicateDesc: string;
  };
  integrations: {
    tag: string;
    heading: string;
    subheading: string;
    items: { name: string; desc: string }[];
  };
  comparison: {
    tag: string;
    heading: string;
    headers: string[];
    features: { title: string; col1: string; col2: string; col3: string }[];
  };
  trust: {
    tag: string;
    heading: string;
    items: { title: string; desc: string }[];
  };
  architecture: {
    tag: string;
    heading: string;
  };
  cta: {
    heading: string;
    subheading: string;
    btnStart: string;
    btnView: string;
  };
}

export const translations: Record<string, TranslationSet> = {
  en: {
    hero: {
      badgeLocalFirst: "Local-first",
      badgeMarkdownTruth: "Markdown truth",
      badgeHumanApproved: "Human-approved",
      badgeCrossAgent: "Cross-agent",
      badgeMcpReady: "MCP-ready",
      title: "File-first memory for AI coding agents.",
      subtitle: "Give multiple AI agents (such as Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, and Cline) concurrent, shared memory across multiple repositories—fully synchronized, sharable, and versioned using Git.",
      btnGetStarted: "Get Started",
      btnViewGitHub: "View GitHub"
    },
    problems: {
      tag: "The Challenge",
      heading: "Agents should remember. They should not silently own memory.",
      pain: "Pain",
      items: [
        { title: "Agents forget", desc: "Agents repeat decisions, setup rules, and project constraints, wasting context and tokens." },
        { title: "Memory is siloed", desc: "Durable memory gets trapped inside one vendor, one specific model, app, or physical machine." },
        { title: "Silent writes are unsafe", desc: "Without human review, agents can write incorrect assumptions that silently poison future iterations." },
        { title: "Rule files bloat context", desc: "Massive custom rule files get sent on every prompt, wasting context window space and causing drift." }
      ]
    },
    solutions: {
      tag: "The Solution",
      heading: "Engram turns memory into reviewed files.",
      subheading: "Agents propose durable rules, workflows, and knowledge. Humans approve what becomes memory. Engram stores it as Markdown, indexes it, and keeps it portable through Git.",
      items: [
        { title: "Human-approved writes", desc: "Agents propose new knowledge. Humans approve, edit, reject, or archive before it is committed." },
        { title: "File-first memory", desc: "Markdown is the source of truth. Transparent, plain-text memory folder structure you fully control." },
        { title: "Context-optimized loading", desc: "Loads and routes only the relevant memory pack instead of sending everything, saving context tokens." },
        { title: "Cross-agent routing", desc: "Your memory layer lives locally in your repo. Sync, query, and edit it using any LLM or IDE." }
      ]
    },
    workflow: {
      tag: "Interactive Flow",
      heading: "How it works",
      steps: [
        { title: "Load relevant memory", desc: "Run /engram load for your current task. The indexer finds semantic matches from your repository memory." },
        { title: "Work with your agent", desc: "The agent receives a lightweight, targeted context block containing only the rules and constraints needed for the job." },
        { title: "Approve durable memory", desc: "The agent proposes structured memory candidates. You audit, modify, and accept them. Git commits them safely." }
      ],
      mockOutput: "# Agent prompts:",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "Web Interface",
      heading: "Configure memory without digging through configuration files.",
      subheading: "Run engram entry to spin up the local visual companion to manage connections, configurations, and memory health.",
      cline: "Cline Integration",
      gemini: "Gemini Antigravity",
      cursor: "Cursor Hook",
      connected: "Connected",
      active: "Active",
      threshold: "Threshold",
      gitAutoCommit: "Git auto-commit",
      duplicateDetected: "Duplicate Detected",
      duplicateDesc: "Two memories refer to release steps.",
      items: [
        { title: "Connections", desc: "Link Engram workspace memory to local agent CLI configurations and managed integrations." },
        { title: "Construct", desc: "Tune semantic load thresholds, rules priority layers, custom profiles, and git sync triggers." },
        { title: "Core", desc: "Analyze memory overlap, scan for duplicates, audit safety gates, and detect configuration conflicts." },
        { title: "Memories", desc: "Browse indexed memory graphs, filter by metadata tags, search contents, and archive outdated knowledge." }
      ]
    },
    integrations: {
      tag: "Integrations",
      heading: "Supported Agents & Host Surfaces",
      subheading: "Engram treats integrations as convenience wrappers. Markdown files remain the sole, portable source of truth.",
      items: [
        { name: "Codex", desc: "Pre-load sessions" },
        { name: "Claude", desc: "MCP & approval" },
        { name: "Gemini", desc: "Workspace routing" },
        { name: "Cursor", desc: "Rules & hooks" },
        { name: "Windsurf", desc: "MCP configurations" },
        { name: "OpenCode", desc: "Plugin integration" },
        { name: "Copilot", desc: "Instruction files" },
        { name: "Cline", desc: "Custom instructions" },
        { name: "MCP", desc: "Exposes load/search" }
      ]
    },
    comparison: {
      tag: "Comparison",
      heading: "How does Engram stack up?",
      headers: ["Feature / Angle", "Built-in Memory", "Huge Custom Rules (AGENTS.md)", "Engram Memory"],
      features: [
        { title: "Vendor Portability", col1: "Locked to app/model", col2: "Text files portable", col3: "Fully portable (Markdown + Git)" },
        { title: "Context Footprint", col1: "Handled by provider", col2: "Heavy context bloat", col3: "Optimized context-loaded packs" },
        { title: "Safety & Audits", col1: "Hidden database", col2: "Plain text files", col3: "Human approval gate & Git log" },
        { title: "Cross-Agent Support", col1: "Single interface", col2: "Requires manual copying", col3: "Unified workspace CLI/MCP/API" },
        { title: "Auto-Write Updates", col1: "Uncontrolled updates", col2: "Manual writing only", col3: "Agent proposes, human validates" }
      ]
    },
    trust: {
      tag: "Security & Trust",
      heading: "Built for memory you can audit.",
      items: [
        { title: "Local-first by default", desc: "No remote databases, no shared clouds. Your memory is stored right in your workspace." },
        { title: "Git-native history", desc: "Every memory update translates to direct file changes. Git commits give you complete auditability." },
        { title: "PII & secret scanning", desc: "Auto-scans agent proposals before committing to prevent leaks of keys, passwords, and private tokens." },
        { title: "Isolation profiles", desc: "Keep personal rules separate from workspace-specific team settings and client constraints." }
      ]
    },
    architecture: {
      tag: "Architecture",
      heading: "The Engram Lifecycle"
    },
    cta: {
      heading: "Ready to own your agent's memory?",
      subheading: "Install Engram, connect your workspace agent, and start routing reviewed plain-text memory in your next coding session.",
      btnStart: "Start the Quickstart",
      btnView: "View GitHub"
    }
  },
  vi: {
    hero: {
      badgeLocalFirst: "Local-first",
      badgeMarkdownTruth: "Markdown lưu trữ",
      badgeHumanApproved: "Con người phê duyệt",
      badgeCrossAgent: "Đa tác nhân",
      badgeMcpReady: "Sẵn sàng MCP",
      title: "Bộ nhớ tệp tin tối ưu cho tác nhân AI code.",
      subtitle: "Cung cấp bộ nhớ chia sẻ song song cho nhiều tác nhân AI (như Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot và Cline) trên nhiều repository—đồng bộ hoàn toàn, dễ chia sẻ và quản lý phiên bản bằng Git.",
      btnGetStarted: "Bắt đầu ngay",
      btnViewGitHub: "Xem trên GitHub"
    },
    problems: {
      tag: "Thử Thách",
      heading: "Tác nhân nên ghi nhớ. Nhưng không tự sở hữu bộ nhớ thầm lặng.",
      pain: "Vấn đề",
      items: [
        { title: "Tác nhân mau quên", desc: "Tác nhân lặp lại quyết định, luật thiết lập và ràng buộc dự án, lãng phí ngữ cảnh và token." },
        { title: "Bộ nhớ bị cô lập", desc: "Bộ nhớ bền vững bị mắc kẹt trong một nhà cung cấp, một model, ứng dụng hoặc máy vật lý cụ thể." },
        { title: "Lưu thầm lặng không an toàn", desc: "Không có sự kiểm duyệt của con người, tác nhân có thể lưu các giả định sai lệch đầu độc các bước sau." },
        { title: "Tệp quy tắc làm phình ngữ cảnh", desc: "Các tệp quy tắc tùy chỉnh đồ sộ được gửi trong mỗi prompt, gây lãng phí bộ nhớ ngữ cảnh và sai lệch." }
      ]
    },
    solutions: {
      tag: "Giải Pháp",
      heading: "Engram biến bộ nhớ thành các tệp được kiểm duyệt.",
      subheading: "Tác nhân đề xuất quy tắc bền vững, quy trình và kiến thức. Con người phê duyệt những gì trở thành bộ nhớ. Engram lưu trữ dưới dạng Markdown, lập chỉ mục và duy trì khả năng di động qua Git.",
      items: [
        { title: "Ghi nhớ có duyệt", desc: "Tác nhân đề xuất kiến thức mới. Con người duyệt, sửa, từ chối hoặc lưu trữ trước khi ghi nhận." },
        { title: "Bộ nhớ dạng tệp tin", desc: "Markdown là nguồn sự thật. Cấu trúc thư mục bộ nhớ dạng văn bản thuần trong suốt do bạn kiểm soát." },
        { title: "Tải tối ưu ngữ cảnh", desc: "Chỉ tải và định tuyến gói bộ nhớ có liên quan thay vì gửi tất cả, tiết kiệm token ngữ cảnh." },
        { title: "Định tuyến đa tác nhân", desc: "Lớp bộ nhớ nằm cục bộ trong repo của bạn. Đồng bộ, truy vấn và chỉnh sửa bằng bất kỳ LLM hoặc IDE nào." }
      ]
    },
    workflow: {
      tag: "Luồng Tương Tác",
      heading: "Cách hoạt động",
      steps: [
        { title: "Tải bộ nhớ liên quan", desc: "Chạy /engram load cho tác vụ hiện tại. Bộ lập chỉ mục tìm kiếm các kết quả khớp ngữ nghĩa từ bộ nhớ repo." },
        { title: "Làm việc với tác nhân", desc: "Tác nhân nhận khối ngữ cảnh gọn nhẹ, trúng đích chỉ chứa các quy tắc và ràng buộc cần thiết cho công việc." },
        { title: "Phê duyệt bộ nhớ bền vững", desc: "Tác nhân đề xuất ứng viên bộ nhớ có cấu trúc. Bạn kiểm tra, sửa đổi và chấp nhận. Git commit an toàn." }
      ],
      mockOutput: "# Tác nhân nhắc:",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "Giao Diện Web",
      heading: "Cấu hình bộ nhớ không cần lục lọi tệp cấu hình.",
      subheading: "Chạy engram entry để khởi chạy giao diện trực quan cục bộ để quản lý các kết nối, cấu hình và sức khỏe bộ nhớ.",
      cline: "Tích hợp Cline",
      gemini: "Gemini Antigravity",
      cursor: "Cursor Hook",
      connected: "Đã kết nối",
      active: "Hoạt động",
      threshold: "Ngưỡng",
      gitAutoCommit: "Tự động commit Git",
      duplicateDetected: "Phát hiện trùng lặp",
      duplicateDesc: "Hai bộ nhớ cùng tham chiếu đến các bước phát hành.",
      items: [
        { title: "Kết nối", desc: "Liên kết bộ nhớ workspace Engram với cấu hình CLI tác nhân cục bộ và tích hợp được quản lý." },
        { title: "Thiết lập", desc: "Điều chỉnh ngưỡng tải ngữ nghĩa, lớp ưu tiên quy tắc, profile tùy chỉnh và kích hoạt đồng bộ git." },
        { title: "Cốt lõi", desc: "Phân tích sự chồng chéo bộ nhớ, quét trùng lặp, kiểm duyệt cổng an toàn và phát hiện xung đột cấu hình." },
        { title: "Bộ nhớ", desc: "Duyệt đồ thị bộ nhớ được lập chỉ mục, lọc theo tag metadata, tìm kiếm nội dung và lưu trữ kiến thức cũ." }
      ]
    },
    integrations: {
      tag: "Tích Hợp",
      heading: "Tác nhân & Nền tảng được hỗ trợ",
      subheading: "Engram xem các tích hợp như các trình bọc tiện ích. Các tệp Markdown vẫn là nguồn sự thật duy nhất và di động.",
      items: [
        { name: "Codex", desc: "Tải trước phiên làm việc" },
        { name: "Claude", desc: "MCP & phê duyệt" },
        { name: "Gemini", desc: "Định tuyến workspace" },
        { name: "Cursor", desc: "Quy tắc & hook" },
        { name: "Windsurf", desc: "Cấu hình MCP" },
        { name: "OpenCode", desc: "Tích hợp plugin" },
        { name: "Copilot", desc: "Tệp tin hướng dẫn" },
        { name: "Cline", desc: "Hướng dẫn tùy chỉnh" },
        { name: "MCP", desc: "Cung cấp load/search" }
      ]
    },
    comparison: {
      tag: "So Sánh",
      heading: "Engram vượt trội như thế nào?",
      headers: ["Tính năng / Góc nhìn", "Bộ nhớ tích hợp sẵn", "Quy tắc tùy chỉnh lớn (AGENTS.md)", "Bộ nhớ Engram"],
      features: [
        { title: "Khả năng di động", col1: "Bị khóa trong app/model", col2: "Tệp văn bản di động", col3: "Di động hoàn toàn (Markdown + Git)" },
        { title: "Dung lượng ngữ cảnh", col1: "Do nhà cung cấp xử lý", col2: "Làm phình ngữ cảnh nặng", col3: "Tải gói tối ưu theo ngữ cảnh" },
        { title: "An toàn & Kiểm duyệt", col1: "Cơ sở dữ liệu ẩn", col2: "Tệp văn bản thuần rõ ràng", col3: "Cổng duyệt của người & Git log" },
        { title: "Hỗ trợ đa tác nhân", col1: "Một giao diện duy nhất", col2: "Yêu cầu sao chép thủ công", col3: "Hệ thống chung CLI/MCP/API" },
        { title: "Tự động cập nhật", col1: "Cập nhật không kiểm soát", col2: "Chỉ ghi thủ công", col3: "Tác nhân đề xuất, người xác thực" }
      ]
    },
    trust: {
      tag: "Bảo Mật & Tin Cậy",
      heading: "Được thiết kế cho bộ nhớ có thể kiểm duyệt.",
      items: [
        { title: "Cục bộ mặc định", desc: "Không database từ xa, không cloud dùng chung. Bộ nhớ của bạn được lưu ngay trong workspace." },
        { title: "Lịch sử dựa trên Git", desc: "Mỗi cập nhật bộ nhớ chuyển dịch trực tiếp thành thay đổi tệp. Commit Git giúp kiểm duyệt toàn diện." },
        { title: "Quét PII & thông tin nhạy cảm", desc: "Tự động quét đề xuất của tác nhân trước khi ghi để tránh rò rỉ key, mật khẩu và token riêng tư." },
        { title: "Profile cô lập", desc: "Giữ quy tắc cá nhân tách biệt với cài đặt nhóm của dự án và các ràng buộc của khách hàng." }
      ]
    },
    architecture: {
      tag: "Kiến Trúc",
      heading: "Vòng đời của Engram"
    },
    cta: {
      heading: "Sẵn sàng làm chủ bộ nhớ tác nhân của bạn?",
      subheading: "Cài đặt Engram, kết nối tác nhân workspace của bạn và bắt đầu định tuyến bộ nhớ văn bản thuần được duyệt trong phiên code tiếp theo.",
      btnStart: "Bắt đầu hướng dẫn nhanh",
      btnView: "Xem trên GitHub"
    }
  },
  es: {
    hero: {
      badgeLocalFirst: "Local-first",
      badgeMarkdownTruth: "Veracidad en Markdown",
      badgeHumanApproved: "Aprobado por humanos",
      badgeCrossAgent: "Multi-agente",
      badgeMcpReady: "Listo para MCP",
      title: "Memoria basada en archivos para agentes de IA.",
      subtitle: "Proporcione a múltiples agentes de IA (como Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot y Cline) memoria compartida y concurrente a través de múltiples repositorios, completamente sincronizada y versionada con Git.",
      btnGetStarted: "Comenzar",
      btnViewGitHub: "Ver GitHub"
    },
    problems: {
      tag: "El Desafío",
      heading: "Los agentes deben recordar. No poseer memoria silenciosamente.",
      pain: "Problema",
      items: [
        { title: "Los agentes olvidan", desc: "Los agentes repiten decisiones, reglas de configuración y restricciones del proyecto, desperdiciando contexto y tokens." },
        { title: "Memoria aislada", desc: "La memoria duradera queda atrapada dentro de un proveedor, un modelo específico, aplicación o máquina física." },
        { title: "Escrituras silenciosas inseguras", desc: "Sin revisión humana, los agentes pueden escribir suposiciones incorrectas que envenenan silenciosamente futuras iteraciones." },
        { title: "Reglas inflan el contexto", desc: "Archivos de reglas masivos se envían en cada consulta, desperdiciando ventana de contexto y causando desvíos." }
      ]
    },
    solutions: {
      tag: "La Solución",
      heading: "Engram convierte la memoria en archivos revisados.",
      subheading: "Los agentes proponen reglas duraderas, flujos de trabajo y conocimiento. Los humanos aprueban lo que se convierte en memoria. Engram lo almacena como Markdown y lo mantiene portátil a través de Git.",
      items: [
        { title: "Escrituras aprobadas", desc: "Los agentes proponen nuevo conocimiento. Los humanos aprueban, editan, rechazan o archivan antes de confirmar." },
        { title: "Memoria basada en archivos", desc: "Markdown es la fuente de verdad. Estructura de carpetas transparente en texto plano que controlas por completo." },
        { title: "Carga optimizada", desc: "Carga y enruta solo el paquete de memoria relevante en lugar de enviar todo, ahorrando tokens de contexto." },
        { title: "Ruteo multi-agente", desc: "Tu capa de memoria vive localmente en tu repositorio. Sincroniza, consulta y edita con cualquier LLM o IDE." }
      ]
    },
    workflow: {
      tag: "Flujo Interactivo",
      heading: "Cómo funciona",
      steps: [
        { title: "Cargar memoria relevante", desc: "Ejecuta /engram load para tu tarea. El indexador busca coincidencias semánticas en la memoria del repositorio." },
        { title: "Trabajar con tu agente", desc: "El agente recibe un bloque de contexto ligero y específico con las reglas y restricciones necesarias para el trabajo." },
        { title: "Aprobar memoria duradera", desc: "El agente propone candidatos de memoria estructurada. Auditas, modificas y aceptas. Git los confirma de forma segura." }
      ],
      mockOutput: "# Indicaciones del agente:",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "Interfaz Web",
      heading: "Configura la memoria sin rebuscar en archivos de configuración.",
      subheading: "Ejecuta engram entry para iniciar la herramienta visual local para gestionar conexiones, configuraciones y salud de la memoria.",
      cline: "Integración con Cline",
      gemini: "Gemini Antigravity",
      cursor: "Gancho de Cursor",
      connected: "Conectado",
      active: "Activo",
      threshold: "Umbral",
      gitAutoCommit: "Auto-commit de Git",
      duplicateDetected: "Duplicado detectado",
      duplicateDesc: "Dos recuerdos se refieren a los pasos de lanzamiento.",
      items: [
        { title: "Conexiones", desc: "Vincula la memoria de Engram con las configuraciones CLI de tus agentes locales e integraciones." },
        { title: "Construcción", desc: "Ajusta los umbrales de carga semántica, capas de prioridad de reglas, perfiles y sincronización de git." },
        { title: "Núcleo", desc: "Analiza la superposición de memoria, escanea duplicados, audita puertas de seguridad y detecta conflictos." },
        { title: "Memorias", desc: "Explora gráficos de memoria indexada, filtra por etiquetas de metadatos, busca contenidos y archiva conocimiento." }
      ]
    },
    integrations: {
      tag: "Integraciones",
      heading: "Agentes y Plataformas Soportados",
      subheading: "Engram trata las integraciones como envolturas convenientes. Los archivos Markdown siguen siendo la única fuente de verdad portátil.",
      items: [
        { name: "Codex", desc: "Pre-cargar sesiones" },
        { name: "Claude", desc: "MCP y aprobación" },
        { name: "Gemini", desc: "Ruteo de workspace" },
        { name: "Cursor", desc: "Reglas y ganchos" },
        { name: "Windsurf", desc: "Configuraciones MCP" },
        { name: "OpenCode", desc: "Integración de plugins" },
        { name: "Copilot", desc: "Archivos de instrucciones" },
        { name: "Cline", desc: "Instrucciones personalizadas" },
        { name: "MCP", desc: "Expone load/search" }
      ]
    },
    comparison: {
      tag: "Comparación",
      heading: "¿Cómo se compara Engram?",
      headers: ["Característica / Ángulo", "Memoria Integrada", "Reglas personalizadas (AGENTS.md)", "Memoria de Engram"],
      features: [
        { title: "Portabilidad de Proveedor", col1: "Bloqueado a la app/modelo", col2: "Archivos de texto portátiles", col3: "Totalmente portátil (Markdown + Git)" },
        { title: "Huella de Contexto", col1: "Manejado por el proveedor", col2: "Alto consumo de contexto", col3: "Paquetes optimizados según contexto" },
        { title: "Seguridad y Auditorías", col1: "Base de datos oculta", col2: "Archivos de texto plano", col3: "Aprobación humana y registro Git" },
        { title: "Soporte Multi-Agente", col1: "Interfaz única", col2: "Requiere copia manual", col3: "Workspace unificado CLI/MCP/API" },
        { title: "Actualizaciones Automáticas", col1: "Actualizaciones sin control", col2: "Solo escritura manual", col3: "Agente propone, humano valida" }
      ]
    },
    trust: {
      tag: "Seguridad y Confianza",
      heading: "Diseñado para memoria que puedes auditar.",
      items: [
        { title: "Local-first por defecto", desc: "Sin bases de datos remotas ni nubes compartidas. Tu memoria se almacena en tu espacio de trabajo." },
        { title: "Historial nativo de Git", desc: "Cada actualización de memoria se traduce en cambios directos de archivos para una auditabilidad completa." },
        { title: "Escaneo de PII y secretos", desc: "Escanea automáticamente las propuestas para prevenir filtraciones de contraseñas, claves y tokens privados." },
        { title: "Perfiles de aislamiento", desc: "Mantén tus reglas personales separadas de las configuraciones del equipo del proyecto y del cliente." }
      ]
    },
    architecture: {
      tag: "Arquitectura",
      heading: "El ciclo de vida de Engram"
    },
    cta: {
      heading: "¿Listo para adueñarte de la memoria de tu agente?",
      subheading: "Instala Engram, conecta tu agente y empieza a enrutar memoria de texto plano revisada en tu próxima sesión de programación.",
      btnStart: "Iniciar guía de inicio rápido",
      btnView: "Ver en GitHub"
    }
  },
  fr: {
    hero: {
      badgeLocalFirst: "Local-first",
      badgeMarkdownTruth: "Vérité Markdown",
      badgeHumanApproved: "Approuvé par l'humain",
      badgeCrossAgent: "Multi-agent",
      badgeMcpReady: "Prêt pour MCP",
      title: "Mémoire basée sur fichiers pour agents de codage IA.",
      subtitle: "Offrez à plusieurs agents IA (tels que Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot et Cline) une mémoire partagée et concurrente sur plusieurs dépôts—entièrement synchronisée et versionnée avec Git.",
      btnGetStarted: "Démarrer",
      btnViewGitHub: "Voir GitHub"
    },
    problems: {
      tag: "Le Défi",
      heading: "Les agents doivent se souvenir. Pas posséder la mémoire en silence.",
      pain: "Problème",
      items: [
        { title: "Les agents oublient", desc: "Les agents répètent les décisions, les règles et les contraintes, gaspillant du contexte et des tokens." },
        { title: "Mémoire cloisonnée", desc: "La mémoire durable reste piégée chez un fournisseur, un modèle spécifique, une appli ou une machine physique." },
        { title: "Écritures silencieuses risquées", desc: "Sans examen humain, les agents peuvent écrire des hypothèses erronées qui empoisonnent les itérations futures." },
        { title: "Fichiers de règles volumineux", desc: "Des fichiers de règles massifs sont envoyés à chaque invite, gaspillant l'espace de contexte et provoquant des dérives." }
      ]
    },
    solutions: {
      tag: "La Solution",
      heading: "Engram transforme la mémoire en fichiers révisés.",
      subheading: "Les agents proposent des règles durables, des flux et des connaissances. Les humains approuvent ce qui devient de la mémoire. Engram la stocke en Markdown et la garde portable via Git.",
      items: [
        { title: "Écritures approuvées", desc: "Les agents proposent de nouvelles connaissances. L'humain approuve, modifie, rejette ou archive avant validation." },
        { title: "Mémoire fichier", desc: "Le Markdown est la source de vérité. Structure de dossiers transparente en texte brut que vous contrôlez." },
        { title: "Chargement optimisé", desc: "Charge et achemine uniquement le pack de mémoire pertinent au lieu de tout envoyer, économisant les tokens." },
        { title: "Routage multi-agent", desc: "Votre couche de mémoire vit localement dans votre dépôt. Synchronisez, interrogez et modifiez avec n'importe quel LLM ou IDE." }
      ]
    },
    workflow: {
      tag: "Flux Interactif",
      heading: "Comment ça marche",
      steps: [
        { title: "Charger la mémoire pertinente", desc: "Exécutez /engram load pour votre tâche. L'indexeur trouve des correspondances sémantiques dans la mémoire du dépôt." },
        { title: "Travailler avec votre agent", desc: "L'agent reçoit un bloc de contexte léger et ciblé ne contenant que les règles et contraintes nécessaires." },
        { title: "Approuver la mémoire durable", desc: "L'agent propose des candidats structurés. Vous contrôlez, modifiez et acceptez. Git les valide de manière sécurisée." }
      ],
      mockOutput: "# Instructions de l'agent :",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "Interface Web",
      heading: "Configurez la mémoire sans fouiller dans les fichiers de configuration.",
      subheading: "Lancez engram entry pour démarrer le compagnon visuel local afin de gérer les connexions, les configurations et la santé de la mémoire.",
      cline: "Intégration Cline",
      gemini: "Gemini Antigravity",
      cursor: "Hook Cursor",
      connected: "Connecté",
      active: "Actif",
      threshold: "Seuil",
      gitAutoCommit: "Auto-commit Git",
      duplicateDetected: "Doublon détecté",
      duplicateDesc: "Deux mémoires font référence aux étapes de publication.",
      items: [
        { title: "Connexions", desc: "Liez la mémoire Engram aux configurations CLI de vos agents locaux et aux intégrations gérées." },
        { title: "Structure", desc: "Ajustez les seuils sémantiques, les priorités de règles, les profils personnalisés et les déclencheurs git." },
        { title: "Cœur", desc: "Analysez le chevauchement, recherchez les doublons, contrôlez les portes de sécurité et détectez les conflits." },
        { title: "Mémoires", desc: "Explorez les graphes indexés, filtrez par tags de métadonnées, recherchez et archivez les connaissances obsolètes." }
      ]
    },
    integrations: {
      tag: "Intégrations",
      heading: "Agents et Plateformes Supportés",
      subheading: "Engram traite les intégrations comme des wrappers pratiques. Les fichiers Markdown restent la seule source de vérité portable.",
      items: [
        { name: "Codex", desc: "Pré-charger les sessions" },
        { name: "Claude", desc: "MCP et approbation" },
        { name: "Gemini", desc: "Routage de workspace" },
        { name: "Cursor", desc: "Regles et hooks" },
        { name: "Windsurf", desc: "Configurations MCP" },
        { name: "OpenCode", desc: "Intégration de plugins" },
        { name: "Copilot", desc: "Fichiers d'instructions" },
        { name: "Cline", desc: "Instructions personnalisées" },
        { name: "MCP", desc: "Expose load/search" }
      ]
    },
    comparison: {
      tag: "Comparaison",
      heading: "Comment se positionne Engram ?",
      headers: ["Fonctionnalité / Angle", "Mémoire intégrée", "Règles personnalisées (AGENTS.md)", "Mémoire Engram"],
      features: [
        { title: "Portabilité Fournisseur", col1: "Verrouillé à l'app/modèle", col2: "Fichiers texte portables", col3: "Entièrement portable (Markdown + Git)" },
        { title: "Empreinte Contexte", col1: "Géré par le fournisseur", col2: "Surcharge de contexte lourde", col3: "Packs optimisés chargés selon le contexte" },
        { title: "Sécurité & Audits", col1: "Base de données masquée", col2: "Fichiers en texte brut", col3: "Validation humaine et journal Git" },
        { title: "Support Multi-Agent", col1: "Interface unique", col2: "Copie manuelle requise", col3: "Workspace unifié CLI/MCP/API" },
        { title: "Mises à jour Auto", col1: "Mises à jour non contrôlées", col2: "Écriture manuelle uniquement", col3: "L'agent propose, l'humain valide" }
      ]
    },
    trust: {
      tag: "Sécurité et Confiance",
      heading: "Conçu pour une mémoire que vous pouvez auditer.",
      items: [
        { title: "Local-first par défaut", desc: "Pas de base de données distante, pas de cloud partagé. Votre mémoire est stockée dans votre espace de travail." },
        { title: "Historique natif Git", desc: "Chaque mise à jour se traduit par des modifications directes de fichiers. Les commits Git offrent une auditabilité totale." },
        { title: "Scan PII et secrets", desc: "Scanne automatiquement les propositions des agents pour éviter les fuites de clés, mots de passe et tokens." },
        { title: "Profils d'isolation", desc: "Séparez vos règles personnelles des configurations d'équipe spécifiques au projet et au client." }
      ]
    },
    architecture: {
      tag: "Architecture",
      heading: "Le cycle de vie d'Engram"
    },
    cta: {
      heading: "Prêt à posséder la mémoire de votre agent ?",
      subheading: "Installez Engram, connectez votre agent et commencez à acheminer de la mémoire texte brut révisée lors de votre prochain codage.",
      btnStart: "Lancer le guide rapide",
      btnView: "Voir sur GitHub"
    }
  },
  zh: {
    hero: {
      badgeLocalFirst: "本地优先",
      badgeMarkdownTruth: "Markdown 真实源",
      badgeHumanApproved: "人工审核",
      badgeCrossAgent: "跨智能体",
      badgeMcpReady: "支持 MCP",
      title: "为 AI 编程智能体设计的本地文件记忆层。",
      subtitle: "为多个 AI 智能体（如 Codex、Claude、Gemini、Cursor、Windsurf、OpenCode、Copilot 和 Cline）提供跨多个代码库的并发共享内存——完全同步、可共享，并使用 Git 进行版本控制。",
      btnGetStarted: "开始使用",
      btnViewGitHub: "查看 GitHub"
    },
    problems: {
      tag: "面临的挑战",
      heading: "智能体需要记忆，但不应默默地占有记忆。",
      pain: "痛点",
      items: [
        { title: "智能体易忘", desc: "智能体会重复决策、设置规则和项目约束，浪费上下文窗口和 Token。" },
        { title: "记忆孤岛", desc: "持久化记忆被困在单个供应商、特定模型、应用程序或物理机器中。" },
        { title: "静默写入不安全", desc: "没有人工审查，智能体可能会写入错误的假设，从而默默地毒害未来的迭代。" },
        { title: "规则文件臃肿", desc: "每次提示都发送庞大的自定义规则文件，浪费上下文空间并导致行为偏移。" }
      ]
    },
    solutions: {
      tag: "解决方案",
      heading: "Engram 将记忆转化为经过人工审核的文件。",
      subheading: "智能体提出持久的规则、工作流和知识。人类批准什么成为记忆。Engram 将其存储为 Markdown，通过 Git 保持其可移植性。",
      items: [
        { title: "人工审核写入", desc: "智能体提出新知识。人类在提交之前进行批准、编辑、拒绝或归档。" },
        { title: "本地文件记忆", desc: "Markdown 是真实的源头。完全由您控制的透明纯文本记忆文件夹结构。" },
        { title: "上下文优化加载", desc: "仅加载和路由相关的内存包，而不是发送所有内容，从而节省上下文 Token。" },
        { title: "跨智能体路由", desc: "您的记忆层本地保存在您的 repo 中。使用任何 LLM 或 IDE 进行同步、查询和编辑。" }
      ]
    },
    workflow: {
      tag: "交互流程",
      heading: "工作原理",
      steps: [
        { title: "加载相关记忆", desc: "为当前任务运行 /engram load。索引器会从您的仓库内存中找到语义匹配项。" },
        { title: "与智能体协作", desc: "智能体接收轻量级、针对性的上下文块，其中仅包含该工作所需的规则和约束。" },
        { title: "批准持久记忆", desc: "智能体提出结构化的记忆候选。您进行审计、修改和接受。Git 安全地提交它们。" }
      ],
      mockOutput: "# 智能体提示:",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "Web 界面",
      heading: "无需深挖配置文件即可配置记忆层。",
      subheading: "运行 engram entry 启动本地可视化工具，轻松管理连接、配置和记忆健康状态。",
      cline: "Cline 集成",
      gemini: "Gemini Antigravity",
      cursor: "Cursor 钩子",
      connected: "已连接",
      active: "活动中",
      threshold: "阈值",
      gitAutoCommit: "Git 自动提交",
      duplicateDetected: "检测到重复项",
      duplicateDesc: "两个记忆都指向了发布步骤。",
      items: [
        { title: "连接管理", desc: "将 Engram 工作空间记忆链接到本地智能体 CLI 配置和托管集成。" },
        { title: "构建参数", desc: "调整语义加载阈值、规则优先级层、自定义配置文件和 git 同步触发器。" },
        { title: "核心诊断", desc: "分析记忆重叠，扫描重复项，审计安全门，并检测配置冲突。" },
        { title: "记忆浏览器", desc: "浏览索引的记忆图，按元数据标签过滤，搜索内容，并归档过时的知识。" }
      ]
    },
    integrations: {
      tag: "集成",
      heading: "支持的智能体与运行平台",
      subheading: "Engram 将集成视为便利的包装器。Markdown 文件仍然是唯一、可移植的真实源头。",
      items: [
        { name: "Codex", desc: "预加载会话" },
        { name: "Claude", desc: "MCP 与审批" },
        { name: "Gemini", desc: "工作区路由" },
        { name: "Cursor", desc: "规则与钩子" },
        { name: "Windsurf", desc: "MCP 配置" },
        { name: "OpenCode", desc: "插件集成" },
        { name: "Copilot", desc: "指令文件" },
        { name: "Cline", desc: "自定义指令" },
        { name: "MCP", desc: "提供 load/search" }
      ]
    },
    comparison: {
      tag: "对比",
      heading: "Engram 对比其他方案表现如何？",
      headers: ["特性 / 维度", "内置记忆", "庞大的自定义规则 (AGENTS.md)", "Engram 记忆"],
      features: [
        { title: "供应商可移植性", col1: "锁定到特定的应用/模型", col2: "文本文件易移植", col3: "完全可移植 (Markdown + Git)" },
        { title: "上下文占用", col1: "由提供商处理", col2: "严重的上下文膨胀", col3: "按上下文优化加载的精简包" },
        { title: "安全性与审计", col1: "隐藏的数据库", col2: "明文文本文件", col3: "人工审核门禁与 Git 日志" },
        { title: "多智能体支持", col1: "单一界面", col2: "需要手动复制", col3: "统一的代码库 CLI/MCP/API" },
        { title: "自动更新写入", col1: "不受控制的更新", col2: "仅限手动编写", col3: "智能体提议，人类验证" }
      ]
    },
    trust: {
      tag: "安全与信任",
      heading: "专为可审计的记忆而设计。",
      items: [
        { title: "默认本地优先", desc: "无远程数据库，无共享云端。您的记忆直接存储在您的工作空间中。" },
        { title: "Git 原生历史", desc: "每一次记忆更新都会直接转化为文件更改。Git 提交为您提供完整的可审计性。" },
        { title: "敏感信息与密钥扫描", desc: "在提交前自动扫描智能体提案，防止泄露密钥、密码和私有 Token。" },
        { title: "隔离配置文件", desc: "将个人规则与特定于工作区的团队设置和客户约束保持分离。" }
      ]
    },
    architecture: {
      tag: "架构",
      heading: "Engram 生命周期"
    },
    cta: {
      heading: "准备好掌控您的智能体记忆了吗？",
      subheading: "安装 Engram，连接您的工作空间智能体，并在下一次编码会话中开始路由经过审核的明文记忆。",
      btnStart: "开始快速入门",
      btnView: "在 GitHub 上查看"
    }
  },
  ko: {
    hero: {
      badgeLocalFirst: "로컬 우선",
      badgeMarkdownTruth: "마크다운 소스",
      badgeHumanApproved: "인간 승인",
      badgeCrossAgent: "크로스 에이전트",
      badgeMcpReady: "MCP 준비 완료",
      title: "AI 코딩 에이전트를 위한 파일 기반 기억 레이어.",
      subtitle: "여러 AI 에이전트(Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline 등)에 여러 리포지토리에 걸친 동시 공유 메모리를 제공하세요—Git을 통해 완벽하게 동기화되고 공유 및 버전 관리됩니다.",
      btnGetStarted: "시작하기",
      btnViewGitHub: "GitHub 보기"
    },
    problems: {
      tag: "해결 과제",
      heading: "에이전트는 기억해야 합니다. 메모리를 임의로 소유해서는 안 됩니다.",
      pain: "문제점",
      items: [
        { title: "에이전트의 망각", desc: "에이전트가 결정, 설정 규칙, 프로젝트 제약을 반복하여 컨텍스트와 토큰을 낭비합니다." },
        { title: "메모리 격차", desc: "지속적인 기억이 단일 공급업체, 특정 모델, 앱 또는 물리적 컴퓨터 내부에 갇힙니다." },
        { title: "불안전한 자동 기록", desc: "인간의 검토 없이는 에이전트가 잘못된 가정을 기록하여 향후 작업을 손상시킬 수 있습니다." },
        { title: "규칙 파일의 메모리 낭비", desc: "프롬프트마다 대규모 사용자 정의 규칙 파일이 전송되어 컨텍스트 창 공간이 낭비되고 드리프트가 발생합니다." }
      ]
    },
    solutions: {
      tag: "해결책",
      heading: "Engram은 메모리를 검토된 파일로 변환합니다.",
      subheading: "에이전트는 지속 가능한 규칙, 워크플로 및 지식을 제안합니다. 인간은 무엇이 기억으로 기록될지 승인합니다. Engram은 이를 마크다운으로 저장하고 Git을 통해 이동성을 유지합니다.",
      items: [
        { title: "인간 승인 기반 기록", desc: "에이전트가 새로운 지식을 제안합니다. 인간은 커밋되기 전에 승인, 편집, 거부 또는 아카이브합니다." },
        { title: "파일 기반 기억", desc: "마크다운이 진실의 원천입니다. 사용자가 직접 제어하는 투명한 일반 텍스트 메모리 폴더 구조입니다." },
        { title: "컨텍스트 최적화 로드", desc: "모든 것을 보내는 대신 관련된 메모리 팩만 로드하고 라우팅하여 컨텍스트 토큰을 절약합니다." },
        { title: "크로스 에이전트 라우팅", desc: "메모리 레이어가 리포지토리에 로컬로 유지됩니다. 모든 LLM 또는 IDE를 사용하여 동기화, 쿼리 및 편집할 수 있습니다." }
      ]
    },
    workflow: {
      tag: "상호작용 흐름",
      heading: "작동 원리",
      steps: [
        { title: "관련 메모리 로드", desc: "현재 작업에 대해 /engram load를 실행합니다. 인덱서가 리포지토리 메모리에서 의미론적 일치를 찾습니다." },
        { title: "에이전트와 협업", desc: "에이전트는 작업에 필요한 규칙과 제약 조건만 포함된 가볍고 대상이 지정된 컨텍스트 블록을 받습니다." },
        { title: "지속 가능한 메모리 승인", desc: "에이전트가 구조화된 메모리 후보를 제안합니다. 사용자가 감사, 수정 및 수락합니다. Git이 안전하게 커밋합니다." }
      ],
      mockOutput: "# 에이전트 프롬프트:",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "웹 인터페이스",
      heading: "설정 파일을 뒤지지 않고도 기억을 구성할 수 있습니다.",
      subheading: "engram entry를 실행하여 연결, 설정 및 메모리 상태를 관리하는 로컬 비주얼 컴패니언을 띄울 수 있습니다.",
      cline: "Cline 통합",
      gemini: "Gemini Antigravity",
      cursor: "Cursor 훅",
      connected: "연결됨",
      active: "활성",
      threshold: "임계값",
      gitAutoCommit: "Git 자동 커밋",
      duplicateDetected: "중복 감지됨",
      duplicateDesc: "두 메모리가 릴리스 단계를 참조하고 있습니다.",
      items: [
        { title: "연결 관리", desc: "Engram 작업 공간 메모리를 로컬 에이전트 CLI 설정 및 관리형 통합에 연결합니다." },
        { title: "설정 구성", desc: "의미론적 로드 임계값, 규칙 우선순위 레이어, 사용자 정의 프로필 및 git 동기화 트리거를 조정합니다." },
        { title: "핵심 분석", desc: "메모리 겹침을 분석하고, 중복을 스캔하고, 보안 게이트를 감사하고, 설정 충돌을 감지합니다." },
        { title: "메모리 탐색", desc: "인덱싱된 메모리 그래프를 탐색하고, 메타데이터 태그로 필터링하고, 내용을 검색하고, 오래된 지식을 아카이브합니다." }
      ]
    },
    integrations: {
      tag: "통합",
      heading: "지원되는 에이전트 및 호스트 환경",
      subheading: "Engram은 통합을 편의성 래퍼로 취급합니다. 마크다운 파일은 유일하고 이동 가능한 진실의 원천으로 유지됩니다.",
      items: [
        { name: "Codex", desc: "세션 사전 로드" },
        { name: "Claude", desc: "MCP 및 승인" },
        { name: "Gemini", desc: "작업 공간 라우팅" },
        { name: "Cursor", desc: "규칙 및 훅" },
        { name: "Windsurf", desc: "MCP 설정" },
        { name: "OpenCode", desc: "플러그인 통합" },
        { name: "Copilot", desc: "지침 파일" },
        { name: "Cline", desc: "사용자 정의 지침" },
        { name: "MCP", desc: "load/search 노출" }
      ]
    },
    comparison: {
      tag: "비교",
      heading: "Engram은 어떻게 다를까요?",
      headers: ["기능 / 관점", "기본 내장 메모리", "대규모 사용자 정의 규칙 (AGENTS.md)", "Engram 메모리"],
      features: [
        { title: "공급업체 이동성", col1: "앱/모델에 고정됨", col2: "텍스트 파일 이동 가능", col3: "완전한 이동성 보장 (Markdown + Git)" },
        { title: "컨텍스트 풋프린트", col1: "제공업체가 처리", col2: "심각한 컨텍스트 낭비", col3: "컨텍스트에 맞춰 로드되는 최적화된 팩" },
        { title: "안전성 및 감사", col1: "숨겨진 데이터베이스", col2: "일반 텍스트 파일", col3: "인간 승인 게이트 및 Git 로그 제공" },
        { title: "크로스 에이전트 지원", col1: "단일 인터페이스", col2: "수동 복사 필요", col3: "통합된 작업 공간 CLI/MCP/API" },
        { title: "자동 업데이트 자동화", col1: "제어되지 않는 업데이트", col2: "수동 기록만 가능", col3: "에이전트 제안, 인간 유효성 검사" }
      ]
    },
    trust: {
      tag: "보안 및 신뢰",
      heading: "감사할 수 있는 기억을 위해 구축되었습니다.",
      items: [
        { title: "개인 정보 보호", desc: "로컬 저장소 전용 메모리로 PII 및 시크릿 키 유출이 없습니다." },
        { title: "Git 히스토리 보장", desc: "Git 커밋 기반 이력 추적으로 완벽한 추적성과 투명성을 가집니다." },
        { title: "보안 필터 및 검사", desc: "메모리 작성 시 민감 정보를 사전 탐지하는 방화벽 기능을 탑재하고 있습니다." },
        { title: "보안 프로필 관리", desc: "개인 프로필과 기업 코드 규약 설정을 완벽하게 격리하여 적용합니다." }
      ]
    },
    architecture: {
      tag: "아키텍처",
      heading: "Engram 라이프사이클"
    },
    cta: {
      heading: "에이전트의 기억을 직접 소유할 준비가 되셨나요?",
      subheading: "Engram을 설치하고 작업 공간 에이전트를 연결한 다음, 다음 코딩 세션에서 검토된 일반 텍스트 기억을 라우팅해 보세요.",
      btnStart: "빠른 시작 가이드 실행",
      btnView: "GitHub에서 보기"
    }
  },
  ja: {
    hero: {
      badgeLocalFirst: "ローカルファースト",
      badgeMarkdownTruth: "Markdownによる信頼性",
      badgeHumanApproved: "人間による承認",
      badgeCrossAgent: "クロスエージェント",
      badgeMcpReady: "MCP対応",
      title: "AIコーディングエージェントのためのファイルベースの記憶レイヤー。",
      subtitle: "複数のAIエージェント（Codex、Claude、Gemini、Cursor、Windsurf、OpenCode、Copilot、Clineなど）に対して、複数のリポジトリにまたがる並行して共有可能なメモリを提供します—Gitを使用して完全に同期、共有、およびバージョン管理されます。",
      btnGetStarted: "使ってみる",
      btnViewGitHub: "GitHubで見る"
    },
    problems: {
      tag: "課題",
      heading: "エージェントは記憶すべきです。メモリを勝手に所有すべきではありません。",
      pain: "課題",
      items: [
        { title: "エージェントの忘却", desc: "エージェントは決定事項や設定ルール、プロジェクト制約を繰り返し、コンテキストとトークンを無駄にします。" },
        { title: "メモリの孤立", desc: "永続的な記憶が、単一のベンダー、特定のモデル、アプリ、または物理的なマシンの中に閉じ込められます。" },
        { title: "安全でないサイレント書き込み", desc: "人間による検証がないため、エージェントが誤った前提を書き込み、今後の作業を損なう可能性があります。" },
        { title: "ルールファイルの肥大化", desc: "プロンプトごとに巨大なルールファイルが送信され、コンテキスト領域を浪費し、ドリフトを引き起こします。" }
      ]
    },
    solutions: {
      tag: "解決策",
      heading: "Engramはメモリを検証済みのファイルに変換します。",
      subheading: "エージェントは永続的なルール、ワークフロー、および知識を提案します。人間はどれを記憶として残すかを承認します。EngramはそれをMarkdownとして保存し、Gitを通じて移植性を維持します。",
      items: [
        { title: "承認された書き込み", desc: "エージェントが新しい知識を提案します。人間は、コミットされる前に承認、編集、拒否、またはアーカイブします。" },
        { title: "ファイルベース of 記憶", desc: "Markdownが真実のソースです。完全に制御可能な、透明なプレーンテキストのメモリフォルダ構造です." },
        { title: "最適化された読み込み", desc: "すべてを送信する代わりに、関連するメモリパックのみをロードしてルーティングし、コンテキストトークンを節約します。" },
        { title: "クロスエージェントルーティング", desc: "メモリレイヤーはリポジトリのローカルに保持されます。任意のLLMまたはIDEを使用して同期、照会、編集が可能です。" }
      ]
    },
    workflow: {
      tag: "インタラクティブな流れ",
      heading: "仕組み",
      steps: [
        { title: "関連メモリのロード", desc: "現在のタスクに対して /engram load を実行します。インデクサーがリポジトリメモリから意味的な一致を検出します。" },
        { title: "エージェントとの協調", desc: "エージェントは、タスクに必要なルールと制約のみを含む、軽量でターゲットを絞ったコンテキストブロックを受け取ります。" },
        { title: "永続的なメモリの承認", desc: "エージェントが構造化されたメモリ候補を提案します。人間が確認、修正、承認を行います。Gitが安全にコミットします。" }
      ],
      mockOutput: "# エージェントプロンプト:",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "ウェブインターフェース",
      heading: "設定ファイルを掘り返すことなくメモリを構成できます。",
      subheading: "engram entryを実行して、接続、設定、およびメモリの状態を管理するためのローカルビジュアルツールを起動します。",
      cline: "Cline統合",
      gemini: "Gemini Antigravity",
      cursor: "Cursorフック",
      connected: "接続済み",
      active: "アクティブ",
      threshold: "しきい値",
      gitAutoCommit: "Git自動コミット",
      duplicateDetected: "重複が検出されました",
      duplicateDesc: "2つのメモリがリリース手順を参照しています。",
      items: [
        { title: "接続管理", desc: "Engramのワークスペースメモリを、ローカルエージェントのCLI設定や管理対象の統合機能にリンクします。" },
        { title: "構造設定", desc: "意味的読み込みのしきい値、ルールの優先度レイヤー、カスタムプロファイル、およびgitの同期トリガーを調整します。" },
        { title: "コア診断", desc: "メモリの重複を分析し、重複をスキャンし、セキュリティゲートを監査し、設定の競合を検出します。" },
        { title: "メモリ一覧", desc: "インデックス付きのメモリグラフを参照し、メタデータタグでフィルタリングし、内容を検索し、古い知識をアーカイブします。" }
      ]
    },
    integrations: {
      tag: "統合機能",
      heading: "サポートされるエージェントと環境",
      subheading: "Engramは統合を便利なラッパーとして扱います。Markdownファイルは唯一の、ポータブルな真実のソースとして維持されます。",
      items: [
        { name: "Codex", desc: "セッションの事前ロード" },
        { name: "Claude", desc: "MCPと承認" },
        { name: "Gemini", desc: "ワークスペースルーティング" },
        { name: "Cursor", desc: "ルールとフック" },
        { name: "Windsurf", desc: "MCP設定" },
        { name: "OpenCode", desc: "プラグインの統合" },
        { name: "Copilot", desc: "指示ファイル" },
        { name: "Cline", desc: "カスタムの指示" },
        { name: "MCP", desc: "load/searchの公開" }
      ]
    },
    comparison: {
      tag: "比較",
      heading: "Engramの優位性",
      headers: ["機能 / 観点", "内蔵メモリ", "巨大なカスタムルール (AGENTS.md)", "Engramメモリ"],
      features: [
        { title: "ベンダーの移植性", col1: "アプリ/モデルに固定", col2: "テキストファイルの移植性あり", col3: "完全な移植性 (Markdown + Git)" },
        { title: "コンテキスト消費", col1: "プロバイダーが処理", col2: "深刻なコンテキストの肥大化", col3: "最適化されたコンテキスト読み込みパック" },
        { title: "安全と監査", col1: "隠されたデータベース", col2: "プレーンテキストファイル", col3: "人間の承認ゲートとGitログ" },
        { title: "クロスエージェント対応", col1: "単一インターフェース", col2: "手動コピーが必要", col3: "統合されたワークスペースCLI/MCP/API" },
        { title: "自動書き込み更新", col1: "制御不能な更新", col2: "手動書き込みのみ", col3: "エージェントが提案、人間が検証" }
      ]
    },
    trust: {
      tag: "セキュリティと信頼",
      heading: "監査可能なメモリのために構築されました。",
      items: [
        { title: "ローカル環境が基準", desc: "外部サーバーやクラウドは不要。メモリはワークスペース内で完結して保持されます。" },
        { title: "Git対応ヒストリ", desc: "メモリの書き換えはテキストファイルのコミットとして安全にログへ記録され、履歴追跡可能です。" },
        { title: "PIIやシークレット探知", desc: "コミット実行前に個人情報やシークレットキーの漏洩を防ぐフィルタ検査を行います。" },
        { title: "分離した管理設定", desc: "自身の個人設定とワークスペース・クライアント設定を綺麗に切り離して管理・適用します。" }
      ]
    },
    architecture: {
      tag: "アーキテクチャ",
      heading: "Engramのライフサイクル"
    },
    cta: {
      heading: "エージェントの記憶を直接所有する準備はできていますか？",
      subheading: "Engramをインストールし、ワークスペースエージェントを接続して、次のコーディングセッションで検証済みのプレーンテキストメモリのルーティングを開始しましょう。",
      btnStart: "クイックスタートを開始する",
      btnView: "GitHubで見る"
    }
  },
  ru: {
    hero: {
      badgeLocalFirst: "Local-first",
      badgeMarkdownTruth: "Markdown как источник истины",
      badgeHumanApproved: "Одобрено человеком",
      badgeCrossAgent: "Кросс-агентный",
      badgeMcpReady: "Готов к MCP",
      title: "Файловая память для AI-агентов программирования.",
      subtitle: "Предоставьте нескольким AI-агентам (таким как Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot и Cline) параллельную общую память в нескольких репозиториях — полностью синхронизированную и версионируемую с помощью Git.",
      btnGetStarted: "Начать",
      btnViewGitHub: "Посмотреть на GitHub"
    },
    problems: {
      tag: "Проблема",
      heading: "Агенты должны помнить. Но не владеть памятью молча.",
      pain: "Боль",
      items: [
        { title: "Агенты забывают", desc: "Агенты повторяют решения, правила настройки и ограничения проекта, тратя впустую контекст и токены." },
        { title: "Изолированная память", desc: "Долговременная память оказывается заперта внутри одного провайдера, одной модели, приложения или машины." },
        { title: "Небезопасная запись", desc: "Без проверки человеком агенты могут записывать неверные предположения, которые портят будущие итерации." },
        { title: "Файлы правил раздувают контекст", desc: "Огромные файлы правил отправляются при каждом запросе, переполняя окно контекста и вызывая дрейф." }
      ]
    },
    solutions: {
      tag: "Решение",
      heading: "Engram превращает память в проверяемые файлы.",
      subheading: "Агенты предлагают долгосрочные правила, рабочие процессы и знания. Люди одобряют то, что становится памятью. Engram сохраняет её в Markdown и делает переносимой через Git.",
      items: [
        { title: "Запись с одобрения человека", desc: "Агенты предлагают новые знания. Люди одобряют, редактируют, отклоняют или архивируют их перед записью." },
        { title: "Память в виде файлов", desc: "Markdown — это источник истины. Прозрачная папка с текстовыми файлами памяти, которую вы полностью контролируете." },
        { title: "Оптимизация контекста", desc: "Загружает и пересылает только релевантный пакет памяти вместо отправки всего объема, экономя контекстные токены." },
        { title: "Кросс-агентная маршрутизация", desc: "Ваш слой памяти находится локально в вашем репозитории. Синхронизируйте, запрашивайте и редактируйте с любым LLM или IDE." }
      ]
    },
    workflow: {
      tag: "Интерактивный поток",
      heading: "Как это работает",
      steps: [
        { title: "Загрузка релевантной памяти", desc: "Запустите /engram load для вашей текущей задачи. Индексатор найдет семантические соответствия в памяти репозитория." },
        { title: "Работа с агентом", desc: "Агент получает облегченный, целевой блок контекста, содержащий только необходимые для работы правила и ограничения." },
        { title: "Одобрение долгосрочной памяти", desc: "Агент предлагает структурированные элементы памяти. Вы проверяете, изменяете и принимаете их. Git надежно сохраняет их." }
      ],
      mockOutput: "# Подсказки агента:",
      mockPrompt: "Use Engram for this task. Load memory for: refactor the release workflow."
    },
    entryUi: {
      tag: "Веб-интерфейс",
      heading: "Настраивайте память без необходимости копаться в конфигурационных файлах.",
      subheading: "Запустите engram entry, чтобы открыть локальный визуальный помощник для управления подключениями, настройками и здоровьем памяти.",
      cline: "Интеграция с Cline",
      gemini: "Gemini Antigravity",
      cursor: "Хук Cursor",
      connected: "Подключено",
      active: "Активно",
      threshold: "Порог",
      gitAutoCommit: "Авто-коммит Git",
      duplicateDetected: "Обнаружен дубликат",
      duplicateDesc: "Две записи памяти ссылаются на шаги выпуска.",
      items: [
        { title: "Подключения", desc: "Связывайте память рабочего пространства Engram с настройками CLI локальных агентов и интеграциями." },
        { title: "Конструктор", desc: "Настраивайте пороги семантической загрузки, слои приоритетов правил, профили и триггеры синхронизации git." },
        { title: "Ядро", desc: "Анализируйте перекрытие памяти, сканируйте дубликаты, проверяйте шлюзы безопасности и выявляйте конфликты." },
        { title: "Память", desc: "Просматривайте индексированные графы памяти, фильтруйте по тегам метаданных, ищите содержимое и архивируйте знания." }
      ]
    },
    integrations: {
      tag: "Интеграции",
      heading: "Поддерживаемые агенты и платформы",
      subheading: "Engram рассматривает интеграции как удобные оболочки. Файлы Markdown остаются единственным переносимым источником истины.",
      items: [
        { name: "Codex", desc: "Предварительная загрузка" },
        { name: "Claude", desc: "MCP и подтверждение" },
        { name: "Gemini", desc: "Маршрутизация workspace" },
        { name: "Cursor", desc: "Правила и хуки" },
        { name: "Windsurf", desc: "Конфигурации MCP" },
        { name: "OpenCode", desc: "Интеграция плагинов" },
        { name: "Copilot", desc: "Файлы инструкций" },
        { name: "Cline", desc: "Пользовательские инструкции" },
        { name: "MCP", desc: "Предоставляет load/search" }
      ]
    },
    comparison: {
      tag: "Сравнение",
      heading: "Как выглядит Engram на фоне аналогов?",
      headers: ["Функция / Аспект", "Встроенная память", "Огромные правила (AGENTS.md)", "Память Engram"],
      features: [
        { title: "Портативность провайдера", col1: "Привязано к приложению/модели", col2: "Текстовые файлы переносимы", col3: "Полностью переносимо (Markdown + Git)" },
        { title: "Объем контекста", col1: "Управляется провайдером", col2: "Серьезное раздувание контекста", col3: "Оптимизированные пакеты под контекст" },
        { title: "Безопасность и аудит", col1: "Скрытая база данных", col2: "Простые текстовые файлы", col3: "Шлюз одобрения человеком и лог Git" },
        { title: "Кросс-агентная поддержка", col1: "Один интерфейс", col2: "Требует ручного копирования", col3: "Единый рабочий CLI/MCP/API" },
        { title: "Auto-обновление записей", col1: "Неконтролируемые обновления", col2: "Только ручная запись", col3: "Агент предлагает, человек одобряет" }
      ]
    },
    trust: {
      tag: "Безопасность и Доверие",
      heading: "Создано для памяти, которую вы можете проверить.",
      items: [
        { title: "Локальность в приоритете", desc: "Данные хранятся на локальном диске, что предотвращает риск утечки PII и паролей." },
        { title: "Контроль на базе Git", desc: "Синхронизация через Git-коммиты обеспечивает детальное и прозрачное версионирование." },
        { title: "Фильтры безопасности", desc: "Инструмент автоматически сканирует содержимое перед коммитом на наличие секретных ключей." },
        { title: "Профили и политики", desc: "Вы разделяете личные правила и проектные требования команды или клиентов." }
      ]
    },
    architecture: {
      tag: "Архитектура",
      heading: "Жизненный цикл Engram"
    },
    cta: {
      heading: "Готовы управлять памятью своего агента?",
      subheading: "Установите Engram, подключите агента рабочего пространства и начните маршрутизацию проверенной памяти в текстовых файлах.",
      btnStart: "Запустить быстрое руководство",
      btnView: "Посмотреть на GitHub"
    }
  }
};
