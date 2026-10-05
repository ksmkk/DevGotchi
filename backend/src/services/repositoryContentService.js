const MAX_FILES = 60;
const MAX_FILE_BYTES = 180 * 1024;

const ignoredPath = /(^|\/)(node_modules|vendor|dist|build|coverage|\.next|\.git|public\/assets)(\/|$)/i;
const relevantPath = /(^|\/)(package(?:-lock)?\.json|\.env(?:\.[^/]+)?|serverless\.ya?ml|template\.ya?ml|cdk\.json)$|\.(?:[cm]?[jt]sx?|json|ya?ml|tf|properties|ini|conf|config|toml|xml)$/i;

function selectInspectableFiles(tree = []) {
  return tree
    .filter((item) => item.type === 'blob'
      && item.sha
      && !ignoredPath.test(item.path)
      && relevantPath.test(item.path)
      && (!item.size || item.size <= MAX_FILE_BYTES))
    .sort((left, right) => {
      const priority = (path) => /(^|\/)\.env(?:\.|$)|package(?:-lock)?\.json$|\.tf$|(?:serverless|template)\.ya?ml$/i.test(path) ? 0 : 1;
      return priority(left.path) - priority(right.path) || left.path.localeCompare(right.path);
    })
    .slice(0, MAX_FILES);
}

function decodeBlob(data) {
  if (!data || data.encoding !== 'base64' || typeof data.content !== 'string') return null;
  const buffer = Buffer.from(data.content.replace(/\s/g, ''), 'base64');
  if (buffer.length > MAX_FILE_BYTES || buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

function inspectText(content) {
  const buffer = Buffer.from(content, 'utf8');
  if (buffer.length > MAX_FILE_BYTES || buffer.includes(0)) return null;
  return content;
}

function rawFileUrl(owner, repo, branch, filePath) {
  const encodePath = (value) => String(value).split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodePath(branch)}/${encodePath(filePath)}`;
}

async function readRepositoryFiles(github, basePath, tree = [], options = {}) {
  const selected = selectInspectableFiles(tree);
  const files = [];
  const concurrency = 6;
  const useRawContent = options.fetchImpl && options.owner && options.repo && options.branch;

  for (let start = 0; start < selected.length; start += concurrency) {
    const batch = selected.slice(start, start + concurrency);
    const results = await Promise.all(batch.map(async (item) => {
      if (useRawContent) {
        try {
          const response = await options.fetchImpl(
            rawFileUrl(options.owner, options.repo, options.branch, item.path),
            {
              headers: {
                ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
                'User-Agent': 'DevGotchi',
              },
            },
          );
          if (!response.ok) return null;
          const content = inspectText(await response.text());
          return content === null ? null : { path: item.path, content };
        } catch {
          return null;
        }
      }

      const result = await github(`${basePath}/git/blobs/${encodeURIComponent(item.sha)}`, { optional: true });
      if (!result.available) return null;
      const content = decodeBlob(result.data);
      return content === null ? null : { path: item.path, content };
    }));
    files.push(...results.filter(Boolean));
  }

  return files;
}

module.exports = {
  MAX_FILES,
  MAX_FILE_BYTES,
  decodeBlob,
  inspectText,
  rawFileUrl,
  readRepositoryFiles,
  selectInspectableFiles,
};
