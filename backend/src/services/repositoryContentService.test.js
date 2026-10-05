const {
  MAX_FILES,
  decodeBlob,
  readRepositoryFiles,
  selectInspectableFiles,
} = require('./repositoryContentService');

test('limita archivos, excluye binarios, generados y demasiado grandes', () => {
  const tree = [
    { type: 'blob', path: 'node_modules/pkg/index.js', sha: 'ignored', size: 10 },
    { type: 'blob', path: 'image.png', sha: 'binary', size: 10 },
    { type: 'blob', path: 'src/huge.js', sha: 'huge', size: 999999 },
    ...Array.from({ length: MAX_FILES + 5 }, (_, index) => ({
      type: 'blob', path: `src/file-${index}.js`, sha: `sha-${index}`, size: 20,
    })),
  ];
  const selected = selectInspectableFiles(tree);
  expect(selected).toHaveLength(MAX_FILES);
  expect(selected.some((file) => /node_modules|image|huge/.test(file.path))).toBe(false);
});

test('decodifica texto base64 y rechaza contenido binario', () => {
  expect(decodeBlob({ encoding: 'base64', content: Buffer.from('hello').toString('base64') })).toBe('hello');
  expect(decodeBlob({ encoding: 'base64', content: Buffer.from([0, 1, 2]).toString('base64') })).toBeNull();
});

test('descarga sólo blobs seleccionados con concurrencia acotada', async () => {
  const github = jest.fn().mockResolvedValue({
    available: true,
    data: { encoding: 'base64', content: Buffer.from('const ok = true;').toString('base64') },
  });
  const files = await readRepositoryFiles(github, '/repos/acme/app', [
    { type: 'blob', path: 'src/app.js', sha: 'abc', size: 20 },
    { type: 'blob', path: 'logo.png', sha: 'def', size: 20 },
  ]);
  expect(files).toEqual([{ path: 'src/app.js', content: 'const ok = true;' }]);
  expect(github).toHaveBeenCalledTimes(1);
});
