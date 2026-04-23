import { FormEvent } from "react";
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded";
import StickyNote2RoundedIcon from "@mui/icons-material/StickyNote2Rounded";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { WorkspaceAccess, WorkspaceNote } from "../../app/types";

type NotesPanelProps = {
  currentWorkspace?: WorkspaceAccess;
  notes: WorkspaceNote[];
  noteError: string | null;
  isAddingNoteInline: boolean;
  draftNoteTitle: string;
  draftNoteContent: string;
  onStartInlineNote: () => void;
  onDraftNoteTitleChange: (value: string) => void;
  onDraftNoteContentChange: (value: string) => void;
  onSubmitNote: (event: FormEvent<HTMLFormElement>) => void;
  onCancelInlineNote: () => void;
};

export function NotesPanel({
  currentWorkspace,
  notes,
  noteError,
  isAddingNoteInline,
  draftNoteTitle,
  draftNoteContent,
  onStartInlineNote,
  onDraftNoteTitleChange,
  onDraftNoteContentChange,
  onSubmitNote,
  onCancelInlineNote,
}: NotesPanelProps) {
  return (
    <Paper
      elevation={0}
      className="soft-panel workspace-panel"
      sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
        >
          <Box>
            <Typography variant="h6">Notes</Typography>
            <Typography color="text.secondary">
              {currentWorkspace
                ? "Capture workspace context without leaving the app."
                : "Select a workspace to use the notes app."}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<NoteAddRoundedIcon />}
            onClick={onStartInlineNote}
            disabled={isAddingNoteInline || !currentWorkspace}
          >
            Add note
          </Button>
        </Stack>

        <Typography color="text.secondary" variant="body2">
          Notes are stored in this browser for now.
        </Typography>

        {noteError ? <Alert severity="error">{noteError}</Alert> : null}

        {isAddingNoteInline ? (
          <Paper elevation={0} className="note-row note-row-editor">
            <Box component="form" onSubmit={onSubmitNote}>
              <Stack spacing={1.5}>
                <TextField
                  label="Note title"
                  value={draftNoteTitle}
                  onChange={(event) => onDraftNoteTitleChange(event.target.value)}
                  autoFocus
                  fullWidth
                />
                <TextField
                  label="Note"
                  value={draftNoteContent}
                  onChange={(event) => onDraftNoteContentChange(event.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                />
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" color="primary">
                    Save
                  </Button>
                  <Button type="button" variant="text" color="inherit" onClick={onCancelInlineNote}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        ) : null}

        {notes.length === 0 && !isAddingNoteInline ? (
          <Paper elevation={0} className="empty-state">
            <Stack spacing={0.75}>
              <Typography variant="h6">No notes</Typography>
              <Typography color="text.secondary">
                Add a note to capture workspace context or decisions.
              </Typography>
            </Stack>
          </Paper>
        ) : null}

        {notes.length > 0 ? (
          <Box component="ul" className="note-list" aria-label="Workspace notes">
            {notes.map((note) => (
              <Paper key={note.id} component="li" elevation={0} className="note-row">
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <StickyNote2RoundedIcon fontSize="small" color="action" />
                    <Typography variant="subtitle1">{note.title}</Typography>
                  </Stack>
                  {note.content ? (
                    <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                      {note.content}
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            ))}
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
