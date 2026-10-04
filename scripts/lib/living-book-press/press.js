/**
 * Living Book Press — Core Engine
 * Coordinates profiles, atomic registration, PDF rendering, verification and copy lifecycle.
 */

import { LivingBookRegistry } from './registry.js';
import { renderUniqueCopyPdf } from './pdf-renderer.js';
import { SuicideCorseProfile } from './profiles/suicide-corse.js';

export class LivingBookPress {
  constructor(options = {}) {
    this.registry = options.registry || new LivingBookRegistry({ storageDir: options.storageDir });
    this.profiles = new Map();
    this.registerProfile(SuicideCorseProfile);
  }

  registerProfile(profile) {
    if (!profile || !profile.id) {
      throw new Error('Invalid profile: missing profile id');
    }
    this.profiles.set(profile.id, profile);
  }

  getProfile(bookId) {
    return this.profiles.get(bookId) || null;
  }

  listProfiles() {
    return Array.from(this.profiles.values());
  }

  /**
   * Authoritatively issues a unique copy for a Living Book and renders its copy-specific PDF.
   * Enforces the registry-before-render invariant.
   */
  requestCopy(params = {}) {
    const {
      bookId,
      editionId,
      singularization = 'singulier',
      materialProfile = 'accessible',
      format = 'A4',
      biography = {}
    } = params;

    const profile = this.getProfile(bookId);
    if (!profile) {
      throw new Error(`Unrecognized Living Book: ${bookId}`);
    }

    const edKey = editionId || profile.defaultEdition;
    const edition = profile.editions[edKey];
    if (!edition) {
      throw new Error(`Unrecognized edition ${editionId} for book ${bookId}`);
    }

    // Step 1: Allocate authoritative unique copy_id
    const copyId = this.registry.allocateCopyId(bookId, edition.id, profile.prefix);
    const issuedAt = new Date().toISOString();
    const verificationUrl = `${profile.verificationBaseUrl}/${copyId}`;

    // Step 2: Persist provisional RESERVED record in registry before render
    const initialRecord = {
      copy_id: copyId,
      book_id: bookId,
      edition_id: edition.id,
      singularization: singularization === 'standard' ? 'standard' : 'singulier',
      material_profile: materialProfile === 'luxe' ? 'luxe' : 'accessible',
      issued_at: issuedAt,
      edition_source: {
        repository: profile.repository,
        commit: edition.commit,
        manifest_ref: edition.manifest_ref
      },
      status: 'RESERVED',
      verification_url: verificationUrl,
      biography: {
        dedication: biography.dedication || null,
        mission_ref: biography.mission_ref || null,
        parent_copy_id: biography.parent_copy_id || null,
        events: [
          {
            event_type: 'ALLOCATED',
            timestamp: issuedAt,
            description: `Allocated copy_id ${copyId} for edition ${edition.id}`
          }
        ]
      }
    };
    this.registry.saveRecord(initialRecord);

    // Step 3: Render copy-specific PDF artifact
    const renderResult = renderUniqueCopyPdf(initialRecord, {
      bookTitle: profile.title,
      bookSubtitle: profile.subtitle,
      format
    });

    // Step 4: Record render evidence and promote to GENERATED
    const generatedRecord = {
      ...initialRecord,
      render: {
        format,
        print_profile: materialProfile,
        sha256: renderResult.sha256,
        byte_length: renderResult.byteLength,
        generated_at: new Date().toISOString()
      },
      status: 'GENERATED'
    };

    generatedRecord.biography.events.push({
      event_type: 'RENDERED',
      timestamp: generatedRecord.render.generated_at,
      description: `Rendered copy-specific PDF (${renderResult.byteLength} bytes, SHA-256: ${renderResult.sha256})`
    });

    this.registry.saveRecord(generatedRecord);

    return {
      record: generatedRecord,
      pdfBuffer: renderResult.pdfBuffer,
      sha256: renderResult.sha256
    };
  }

  /**
   * Public verification surface: returns minimal non-sensitive verification view.
   */
  verifyCopy(copyId) {
    const record = this.registry.getRecord(copyId);
    if (!record) {
      return {
        found: false,
        copy_id: copyId,
        error: 'Record not found in Living Book registry'
      };
    }

    return {
      found: true,
      copy_id: record.copy_id,
      book_id: record.book_id,
      edition_id: record.edition_id,
      singularization: record.singularization,
      material_profile: record.material_profile,
      status: record.status,
      issued_at: record.issued_at,
      render_sha256: record.render?.sha256 || null,
      edition_commit: record.edition_source?.commit || null,
      verification_url: record.verification_url,
      has_mission: Boolean(record.biography?.mission_ref),
      mission_summary: record.biography?.mission_ref || null
    };
  }

  /**
   * Confirms physical printing / materialization.
   */
  confirmMaterialized(copyId) {
    const record = this.registry.getRecord(copyId);
    if (!record) throw new Error(`Copy not found: ${copyId}`);
    return this.registry.updateStatus(copyId, 'MATERIALIZED', {
      materialized_at: new Date().toISOString()
    });
  }

  /**
   * Explicitly handles duplicate print situations (RC4 resolution).
   */
  handleDuplicatePrint(existingCopyId, options = {}) {
    const { intention = 'rematerialization', reason = 'replacement' } = options;
    const existing = this.registry.getRecord(existingCopyId);
    if (!existing) throw new Error(`Source copy not found: ${existingCopyId}`);

    if (intention === 'rematerialization') {
      // Authorized physical rematerialization of the SAME incarnation
      this.registry.addBiographyEvent(existingCopyId, {
        event_type: 'REMATERIALIZED',
        description: `Physical re-materialization of copy ${existingCopyId} (reason: ${reason})`
      });
      return {
        action: 'rematerialization',
        copy_id: existingCopyId,
        same_incarnation: true,
        message: `Copy ${existingCopyId} documented as physically rematerialized.`
      };
    }

    // Otherwise: incarnation fork! The second physical copy needs its own identity.
    const forkResult = this.requestCopy({
      bookId: existing.book_id,
      editionId: existing.edition_id,
      singularization: existing.singularization,
      materialProfile: existing.material_profile,
      format: existing.render?.format || 'A4',
      biography: {
        parent_copy_id: existingCopyId,
        dedication: existing.biography?.dedication,
        mission_ref: existing.biography?.mission_ref
      }
    });

    this.registry.addBiographyEvent(existingCopyId, {
      event_type: 'INCARNATION_FORKED',
      description: `Incarnation forked to new physical copy ${forkResult.record.copy_id}`
    });

    return {
      action: 'fork',
      parent_copy_id: existingCopyId,
      new_copy_id: forkResult.record.copy_id,
      same_incarnation: false,
      newRecord: forkResult.record,
      message: `Incarnation forked: new physical copy ${forkResult.record.copy_id} issued.`
    };
  }
}
