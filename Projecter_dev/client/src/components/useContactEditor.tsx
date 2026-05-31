import { useCallback, useEffect, useRef, useState } from 'react';
import { api, JsonApiOne } from '../api';
import { ContactFormModal, ContactFormValues } from './ContactFormModal';

interface OrgOption { id: number; code: string; n: number }
interface ContactFacets { organizations: OrgOption[] }

/**
 * Hook réutilisable pour éditer un contact depuis n'importe quelle liste
 * (stakeholders d'un projet, participants d'une réunion, …) avec le même
 * formulaire que la page Contacts.
 *
 * Usage :
 *   const { openContactEditor, contactEditor } = useContactEditor();
 *   <button onClick={() => openContactEditor(contactId, reload)}>✎</button>
 *   {contactEditor}
 */
export function useContactEditor() {
  const [editing, setEditing] = useState<Partial<ContactFormValues> | null | undefined>(undefined);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const onSavedRef = useRef<(() => void) | null>(null);

  // Facettes (organisations) chargées une seule fois
  useEffect(() => {
    let cancelled = false;
    api.get<JsonApiOne<ContactFacets>>('/contacts/facets')
      .then((r) => { if (!cancelled) setOrganizations(r.data.attributes.organizations || []); })
      .catch(() => { if (!cancelled) setOrganizations([]); });
    return () => { cancelled = true; };
  }, []);

  const openContactEditor = useCallback(async (contactId: number, onSaved?: () => void) => {
    setLoadingId(contactId);
    try {
      const r = await api.get<JsonApiOne<ContactFormValues & Record<string, unknown>>>(`/contacts/${contactId}`);
      onSavedRef.current = onSaved || null;
      setEditing({ ...r.data.attributes, id: Number(r.data.id) });
    } catch {
      onSavedRef.current = null;
      setEditing(undefined);
    } finally {
      setLoadingId(null);
    }
  }, []);

  const close = useCallback(() => setEditing(undefined), []);
  const handleSaved = useCallback(() => {
    onSavedRef.current?.();
    setEditing(undefined);
  }, []);

  const contactEditor = (
    <ContactFormModal
      open={editing !== undefined}
      initial={editing ?? null}
      organizations={organizations}
      onClose={close}
      onSaved={handleSaved}
    />
  );

  return { openContactEditor, contactEditor, loadingContactId: loadingId };
}
