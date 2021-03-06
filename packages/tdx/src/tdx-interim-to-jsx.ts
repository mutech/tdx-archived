export default function compiler(this: any, options = { singleBlock: false }) {

  const _toInterim = this.Compiler

  this.Compiler = (tree, file) => {
    const interim = _toInterim(tree, file)
    return toJSX(interim, options)
  }

}

function toJSX(
  tree: any,
  options: any = {}) {

  const blocks = tree


  let layout: string | undefined = undefined
  let exportNames: string[] = []

  const preamble = blocks.map(block => {
        switch (block.type) {
          case 'yaml':
          return ['/**']
          .concat(
            [
              'title',
              'author',
              'repository',
              'license',
              'version',
              'tiniaVersion'
            ].map(key => block.props[key] ? ` * ${key}: ${block.props[key]}` : null)
            .filter(Boolean) as string[]
          )
          .concat([' *  ** this file was system generated by @tinia/tdx **'])
          .concat(['*/\n'])
          .join('\n')

          case 'import':
            return `${block.src}`

          case 'export':
            if (/^export default/.test(block.src)) {
              layout = block.src
                .replace(/^export\s+default\s+/, '')
                .replace(/;\s*$/, '')
            } else if (
              /^export\s{\s?default\s?}\sfrom/.test(block.src) ||
              /^export\s{.*?as\sdefault\s?}/.test(block.src)
            ) {
              let example

              // eslint-disable-next-line max-depth
              if (/\}\s*from\s+/.test(block.src)) {
                example = `
                For example, instead of:
  
                export { default } from './Layout'
  
                use:
  
                import Layout from './Layout'
                export default Layout
              `.trim()
              } else {
                example = `
                For example, instead of:
  
                export { Layout as default }
  
                use:
  
                export default Layout
              `.trim()
              }

              throw new Error(
                `
              TDX doesn't support using "default" as a named export, use "export default" statement instead.
  
              ${example}
            `
                  .trim()
                  .replace(/^ +/gm, '')
              )
            } else {
              const match = block.src.match(/export\s*(var|const|let|class|function)?\s*(\w+)/)
              if (Array.isArray(match)) { exportNames.push(match[2]) }

              return `${block.src}`
            }
          case 'md':
          case 'code':
          case 'jsx':
          case 'html':
          case 'comment':
          default:
            return null
        }
      }).filter(Boolean).join('\n\n')

  const sections = blocks.map(block => {
        switch (block.type) {
          case 'md':
            return block.value

          case 'code':
            return `<Md name="pre"><Md name="code" props={{ className: 'language-${block.language}'}}>${block.src}</Md></Md>`

          case 'jsx':
          case 'html':
            return block.src

          case 'import':
          case 'export':
            return null

          case 'comment':
            return `{/*${block.src}*/}`

          default:
            throw new Error(`unknown block type ${block.type} in export`)
        }
      }).filter(Boolean).join('\n\n')

  return `${preamble}
  ${options.skipExport ? 'const TDXContent =' : 'export default'} (props) => {
  const layout = ${ layout || 'null'}
  const env = useEnv ? useEnv() : {}
  const layoutProps = { ${exportNames.join(',\n')} };

  return <Md 
        name="wrapper" props={{id: "tdx"}}
  ${layout
      ? `Layout={layout} layoutProps={Object.assign({}, layoutProps, props)}`
      : ''
    }>
    ${sections}
  </Md>
    }`
}

