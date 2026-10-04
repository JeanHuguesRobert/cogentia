/**
 * Living Book Profile for "Suicide Corse"
 */

export const SuicideCorseProfile = {
  id: 'suicide-corse',
  prefix: 'SC',
  title: 'SUICIDE CORSE',
  subtitle: 'Publication continue, editions figees, asymetrie fond/forme et materialisations',
  repository: 'JeanHuguesRobert/barons-Mariani',
  editions: {
    '2026-09-17-anniversaire': {
      id: '2026-09-17-anniversaire',
      name: 'Edition 2026-09-17 — Numero special anniversaire',
      commit: '5ffa320ee7de34a97577ed1db8b87d69ccc1349e',
      manifest_ref: 'https://suicidecorse.baronsmariani.org/editions/2026-09-17/manifest.json',
      public_url: 'https://suicidecorse.baronsmariani.org/editions/2026-09-17/',
      chapters_count: 21,
      freeze_date: '2026-09-18T07:00:10+02:00'
    },
    '2026-09-20-n2': {
      id: '2026-09-20-n2',
      name: 'Edition 2026-09-20 — Suicide Corse n°2',
      commit: 'cbb45f1c145cb49c49454e6e4a4df0a62d4617d5',
      manifest_ref: 'https://suicidecorse.baronsmariani.org/editions/2026-09-20-n2/manifest.json',
      public_url: 'https://suicidecorse.baronsmariani.org/editions/2026-09-20-n2/',
      composition: 'double_helix',
      freeze_date: '2026-09-21T10:16:00+02:00'
    },
    '2026-09-30-n3': {
      id: '2026-09-30-n3',
      name: 'Edition 2026-09-30 — Special Senatoriales',
      commit: '91024af6e232d326f5efae1540f316fba5f7a26c',
      manifest_ref: 'https://suicidecorse.baronsmariani.org/editions/2026-09-30-n3/manifest.json',
      public_url: 'https://suicidecorse.baronsmariani.org/editions/2026-09-30-n3/',
      freeze_date: '2026-10-02T14:06:00+02:00'
    }
  },
  defaultEdition: '2026-09-20-n2',
  supportedFormats: ['A4', 'A5'],
  supportedMaterialProfiles: ['accessible', 'luxe'],
  verificationBaseUrl: 'https://suicidecorse.baronsmariani.org/copies'
};
