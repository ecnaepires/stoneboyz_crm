'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addNoteAction, deleteNoteAction, updateNoteAction } from '../../_actions';

interface Note {
  id: string;
  body: string;
  createdAt: string;
  archivedAt: string | null;
}

interface NotesCardProps {
  customerId: string;
  initialNotes: Note[];
}

export function NotesCard({ customerId, initialNotes }: NotesCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const addNoteWithId = addNoteAction.bind(null, customerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes ({initialNotes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {initialNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes.</p>
          ) : (
            <ul className="space-y-3">
              {initialNotes.map((n) => (
                <li key={n.id} className="rounded-md border p-3 text-sm">
                  {editingId === n.id ? (
                    <form
                      action={async (formData) => {
                        await updateNoteAction(customerId, n.id, formData);
                        setEditingId(null);
                        router.refresh();
                      }}
                      className="space-y-2"
                    >
                      <textarea
                        name="body"
                        defaultValue={n.body}
                        rows={3}
                        required
                        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">Save</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="whitespace-pre-wrap">{n.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(n.id)}>Edit</Button>
                        <form action={deleteNoteAction.bind(null, customerId, n.id)}>
                          <Button type="submit" variant="ghost" size="sm">Delete</Button>
                        </form>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form action={addNoteWithId} className="space-y-3">
            <textarea
              name="body"
              rows={3}
              placeholder="Add a note..."
              required
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button type="submit">Add Note</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
