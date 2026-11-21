import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  ignore: [
    'src/components/ui/**',
    'src/components/data-table/**',
    'src/components/layout/app-title.tsx',
    'src/components/layout/team-switcher.tsx',
    'src/components/layout/top-nav.tsx',
  ],
  ignoreDependencies: [
    '@radix-ui/react-icons',
    '@radix-ui/react-switch',
    'date-fns',
    'date-fns-jalali',
  ],
}

export default config
