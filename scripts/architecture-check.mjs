import fs from 'node:fs'
import path from 'node:path'

const fail = (message) => {
  console.error(`ARCHITECTURE CHECK FAILED: ${message}`)
  process.exitCode = 1
}

const legacyBaselines = {
  'src/services': new Set([
    'careService.ts',
    'communityService.ts',
    'documentService.ts',
    'featureExperimentService.ts',
    'observability.ts',
    'petService.ts',
    'placeCheckinService.ts',
    'placeService.ts',
    'placeTelemetryService.ts',
    'postService.ts',
    'rescueService.ts',
    'supabaseClient.ts',
  ]),
  'src/components/views': new Set([
    'CommunitiesView.tsx',
    'CommunityDetailView.tsx',
    'GlobalSearchView.tsx',
    'HomeView.tsx',
    'MapView.tsx',
    'OnboardingView.tsx',
    'PetView.tsx',
    'PublicProfileView.tsx',
    'PublicRescueView.tsx',
  ]),
  'src/components/modals': new Set([
    'AddPetModal.tsx',
    'AlertModal.tsx',
    'CareModal.tsx',
    'CreateCommunityModal.tsx',
    'CreateModal - copia.tsx',
    'CreateModal.tsx',
    'CreatePostModal.tsx',
    'DocumentsModal.tsx',
    'MessagesModal.tsx',
    'NotificationsModal.tsx',
    'PassportModal.tsx',
    'SightingDetailModal.tsx',
    'SuggestPlaceModal.tsx',
  ]),
}

for (const [directory, baseline] of Object.entries(legacyBaselines)) {
  const actual = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)

  for (const filename of actual) {
    if (!baseline.has(filename)) {
      fail(
        `New domain file "${path.join(directory, filename)}" was added to a legacy global folder. ` +
        'Place new domain code under src/features/<domain>/ or consciously update PAZO_ARCHITECTURE_CONTRACT.md and this baseline.'
      )
    }
  }
}

if (!fs.existsSync('docs/PAZO_ARCHITECTURE_CONTRACT.md')) {
  fail('docs/PAZO_ARCHITECTURE_CONTRACT.md is missing.')
}

if (!process.exitCode) {
  console.log('Architecture contract checks: PASS')
}
