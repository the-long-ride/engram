import fs from 'node:fs';
import path from 'node:path';

const locales = ['vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru'];

// Mappings from old filenames to new Docusaurus paths relative to the `docs` folder
const fileMap = {
  'index.md': 'intro.md',
  'quickstart.md': 'quickstart.md',
  'understanding.md': 'concepts/protocol.md',
  'protocol.md': 'concepts/write-path.md',
  'operations.md': 'cli/overview.md',
  'comparison.md': 'comparison/overview.md',
};

// Title and description translation dictionary for Docusaurus frontmatter
const meta = {
  vi: {
    'index.md': {
      title: 'Engram là gì?',
      description: 'Engram là một giao thức bộ nhớ do con người sở hữu dành cho các tác nhân AI (AI agents). Giao thức này lưu giữ kiến thức bền vững dưới dạng các tệp tin mà con người có thể kiểm tra và xem xét.'
    },
    'quickstart.md': {
      title: 'Bắt đầu nhanh với tác nhân AI',
      description: 'Bắt đầu sử dụng Engram thông qua tác nhân AI của bạn. Tải bộ nhớ, thực hiện công việc, sau đó đề xuất lưu bộ nhớ bền vững.'
    },
    'understanding.md': {
      title: 'Giao thức bộ nhớ do con người sở hữu',
      description: 'Engram là một giao thức giúp bộ nhớ của tác nhân AI có thể kiểm tra, di động và được quản lý bởi con người.'
    },
    'protocol.md': {
      title: 'Quy trình ghi và phê duyệt',
      description: 'Tác nhân đề xuất, con người phê duyệt. Chỉ bộ nhớ được phê duyệt mới được ghi, sau đó các chỉ mục, đồ thị và mã băm sẽ được cập nhật.'
    },
    'operations.md': {
      title: 'Tổng quan về lệnh',
      description: 'Bản đồ của mọi lệnh Engram CLI và chức năng của chúng.'
    },
    'comparison.md': {
      title: 'Tổng quan so sánh',
      description: 'Cách Engram so sánh với bộ nhớ tích hợp của tác nhân, agentmemory, Obsidian, Tolaria và Hermes Agent.'
    }
  },
  es: {
    'index.md': {
      title: '¿Qué es Engram?',
      description: 'Engram es un protocolo de memoria de propiedad humana para agentes de IA. Conserva el conocimiento duradero del proyecto, del equipo y de las preferencias personales.'
    },
    'quickstart.md': {
      title: 'Inicio rápido para agentes de IA',
      description: 'Comience a usar Engram a través de su agente de IA. Cargue la memoria, realice el trabajo y luego proponga memoria duradera.'
    },
    'understanding.md': {
      title: 'Protocolo de memoria de propiedad humana',
      description: 'Engram es un protocolo que hace que la memoria del agente de IA sea inspeccionable, portable y gobernada por humanos.'
    },
    'protocol.md': {
      title: 'Ruta de escritura y aprobación',
      description: 'Los agentes proponen, los humanos aprueban. Solo se escribe la memoria aprobada, luego se actualizan los índices, el grafo, los hashes y el registro de cambios.'
    },
    'operations.md': {
      title: 'Descripción general de comandos',
      description: 'Mapa de cada comando de la CLI de Engram y lo que hace.'
    },
    'comparison.md': {
      title: 'Descripción general comparativa',
      description: 'Cómo se compara Engram con la memoria integrada del agente, agentmemory, Obsidian, Tolaria y Hermes Agent.'
    }
  },
  fr: {
    'index.md': {
      title: "Qu'est-ce qu'Engram ?",
      description: "Engram est un protocole de mémoire appartenant à l'homme pour les agents IA. Il conserve des connaissances durables sur les projets, les équipes et les préférences personnelles."
    },
    'quickstart.md': {
      title: "Démarrage rapide pour agent IA",
      description: "Commencez à utiliser Engram via votre agent IA. Chargez la mémoire, faites le travail, puis proposez une mémoire durable lorsqu'un élément utile apparaît."
    },
    'understanding.md': {
      title: "Protocole de mémoire appartenant à l'homme",
      description: "Engram est un protocole qui rend la mémoire de l'agent IA inspectable, portable et gouvernée par les humains."
    },
    'protocol.md': {
      title: "Chemin d'écriture et approbation",
      description: "Les agents proposent, les humains approuvent. Seule la mémoire approuvée est écrite, puis les index, le graphe, les empreintes numériques (hashes) et le journal des modifications sont actualisés."
    },
    'operations.md': {
      title: "Aperçu des commandes",
      description: "Carte de chaque commande CLI d'Engram et ce qu'elle fait."
    },
    'comparison.md': {
      title: "Aperçu comparatif",
      description: "Comment Engram se compare à la mémoire intégrée de l'agent, agentmemory, Obsidian, Tolaria et Hermes Agent."
    }
  },
  zh: {
    'index.md': {
      title: '什么是 Engram？',
      description: 'Engram 是一个由人类掌控的 AI 智能体内存协议。它将持久的项目、团队和个人知识保存在人类可以检查、评审、同步和修复的文件中。'
    },
    'quickstart.md': {
      title: 'AI 智能体快速入门',
      description: '开始通过您的 AI 智能体使用 Engram。加载内存，执行工作，然后在出现有用的信息时建议持久内存。'
    },
    'understanding.md': {
      title: '人类掌控的内存协议',
      description: 'Engram 是一个使 AI 智能体内存可检查、可移植且由人类治理的协议。'
    },
    'protocol.md': {
      title: '写入路径与批准',
      description: '智能体建议，人类批准。仅写入经批准的内存，然后刷新索引、图、哈希和变更日志。'
    },
    'operations.md': {
      title: '命令概览',
      description: '每个 Engram CLI 命令及其功能的映射。'
    },
    'comparison.md': {
      title: '对比概览',
      description: 'Engram 与内置智能体内存、agentmemory、Obsidian、Tolaria 和 Hermes Agent 的对比。'
    }
  },
  ko: {
    'index.md': {
      title: 'Engram이란 무엇인가요?',
      description: 'Engram은 AI 에이전트를 위한 인간 소유의 메모리 프로토콜입니다. 인간이 검사, 검토, 동기화 및 복구할 수 있는 파일에 프로젝트, 팀 및 개인의 영구적인 지식을 보존합니다.'
    },
    'quickstart.md': {
      title: 'AI 에이전트 빠른 시작',
      description: 'AI 에이전트를 통해 Engram을 사용해 보세요. 메모리를 로드하고, 작업을 수행한 다음 유용한 정보가 나타나면 영구 메모리 저장을 제안합니다.'
    },
    'understanding.md': {
      title: '인간 소유의 메모리 프로토콜',
      description: 'Engram은 AI 에이전트 메모리를 인간이 검사하고 이식하며 관리할 수 있도록 만드는 프로토콜입니다.'
    },
    'protocol.md': {
      title: '쓰기 경로 및 승인',
      description: '에이전트가 제안하고 인간이 승인합니다. 승인된 메모리만 기록되며, 이후 인덱스, 그래프, 해시 및 변경 로그가 새로 고쳐집니다.'
    },
    'operations.md': {
      title: '명령어 개요',
      description: '모든 Engram CLI 명령어와 해당 기능의 매핑입니다.'
    },
    'comparison.md': {
      title: '비교 개요',
      description: 'Engram을 내장 에이전트 메모리, agentmemory, Obsidian, Tolaria 및 Hermes Agent와 비교합니다.'
    }
  },
  ja: {
    'index.md': {
      title: 'Engramとは何ですか？',
      description: 'Engramは、AIエージェント向けの人間所有のメモリプロトコルです。人間が検査、レビュー、同期、修復できるファイルに、プロジェクト、チーム、個人の永続的な知識を保持します。'
    },
    'quickstart.md': {
      title: 'AIエージェント クイックスタート',
      description: 'AIエージェントを介してEngramを使い始めましょう。メモリをロードし、作業を行い、有用な情報が現れたときに永続メモリを提案します。'
    },
    'understanding.md': {
      title: '人間所有のメモリプロトコル',
      description: 'Engramは、AIエージェントのメモリを人間が検査、移植、および管理できるようにするプロトコルです。'
    },
    'protocol.md': {
      title: '書き込みパスと承認',
      description: 'エージェントが提案し、人間が承認します。承認されたメモリのみが書き込まれ、その後、インデックス、グラフ、ハッシュ、および変更ログが更新されます。'
    },
    'operations.md': {
      title: 'コマンド概要',
      description: 'すべてのEngram CLIコマンドとそれらの機能のマッピング。'
    },
    'comparison.md': {
      title: '比較概要',
      description: 'Engramとビルトインエージェントメモリ、agentmemory、Obsidian、Tolaria、およびHermes Agentの比較。'
    }
  },
  ru: {
    'index.md': {
      title: 'Что такое Engram?',
      description: 'Engram — это принадлежащий человеку протокол памяти для ИИ-агентов. Он сохраняет долговечные знания проекта, команды и личные предпочтения в файлах.'
    },
    'quickstart.md': {
      title: 'Быстрый старт для ИИ-агента',
      description: 'Начните использовать Engram через ИИ-агента. Загрузите память, выполните работу, а затем предложите сохранить долговечную память.'
    },
    'understanding.md': {
      title: 'Принадлежащий человеку протокол памяти',
      description: 'Engram — это протокол, который делает память ИИ-агента проверяемой, переносимой и управляемой людьми.'
    },
    'protocol.md': {
      title: 'Путь записи и одобрение',
      description: 'Агенты предлагают, люди одобряют. Записывается только одобренная память, после чего обновляются индексы, граф, хэши и журнал изменений.'
    },
    'operations.md': {
      title: 'Обзор команд',
      description: 'Карта каждой команды CLI Engram и того, что она делает.'
    },
    'comparison.md': {
      title: 'Обзор сравнения',
      description: 'Сравнение Engram с встроенной памятью агента, agentmemory, Obsidian, Tolaria и Hermes Agent.'
    }
  }
};

// Sidebar positions matching English
const sidebarPositions = {
  'index.md': 1,
  'quickstart.md': 2,
  'understanding.md': 1,
  'protocol.md': 6,
  'operations.md': 1,
  'comparison.md': 1,
};

// Relative path helper from one path relative to website/docs to another
function getRelativeLink(fromPath, toPath) {
  const fromDir = path.dirname(fromPath);
  const relativePath = path.relative(fromDir, toPath).replace(/\\/g, '/');
  return relativePath;
}

// Read and process a single file
function processFile(locale, srcFile) {
  const srcPath = path.join('documentation', locale, srcFile);
  if (!fs.existsSync(srcPath)) {
    console.error(`Source file not found: ${srcPath}`);
    return null;
  }
  
  let content = fs.readFileSync(srcPath, 'utf8');
  
  // Replace links of type [text](filename.md#anchor) or [text](filename.md)
  content = content.replace(/\[([^\]]+)\]\(([^:\)]+\.md)(#[^)]+)?\)/g, (match, text, linkTarget, anchor = '') => {
    if (fileMap[linkTarget]) {
      const destSource = fileMap[srcFile];
      const destTarget = fileMap[linkTarget];
      const relLink = getRelativeLink(destSource, destTarget);
      return `[${text}](${relLink}${anchor})`;
    }
    return match;
  });

  // Get metadata
  const fileMeta = meta[locale]?.[srcFile] || { title: srcFile.replace('.md', ''), description: '' };
  const position = sidebarPositions[srcFile];
  
  // Build Docusaurus frontmatter
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(fileMeta.title)}`,
    `sidebar_position: ${position}`,
    `description: ${JSON.stringify(fileMeta.description)}`,
    '---',
    '',
    ''
  ].join('\n');

  return frontmatter + content;
}

// Main execution
function main() {
  const currentVersion = 'current';
  const oldVersion = 'version-0.0.26';
  
  for (const locale of locales) {
    console.log(`Processing locale: ${locale}`);
    
    for (const srcFile of Object.keys(fileMap)) {
      const processed = processFile(locale, srcFile);
      if (!processed) continue;
      
      const destRelPath = fileMap[srcFile];
      
      // Paths
      const currentDest = path.join('website', 'i18n', locale, 'docusaurus-plugin-content-docs', currentVersion, destRelPath);
      const oldDest = path.join('website', 'i18n', locale, 'docusaurus-plugin-content-docs', oldVersion, destRelPath);
      
      // Ensure target directories exist
      fs.mkdirSync(path.dirname(currentDest), { recursive: true });
      fs.mkdirSync(path.dirname(oldDest), { recursive: true });
      
      // Write current
      fs.writeFileSync(currentDest, processed, 'utf8');
      console.log(`  Wrote: ${currentDest}`);
      
      // Write old version
      fs.writeFileSync(oldDest, processed, 'utf8');
      console.log(`  Wrote: ${oldDest}`);
    }
  }
  console.log('All locale files generated successfully!');
}

main();
