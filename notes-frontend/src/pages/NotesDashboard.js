import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Typography,
  Grid,
  Paper,
  IconButton,
  CircularProgress,
  Backdrop,
  Fade,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import sanitizeHtml from 'sanitize-html';
import { debounce } from 'lodash';
import Autocomplete from '@mui/material/Autocomplete';

import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
} from '../api/api';

const pastelColors = ['#F9F0FF', '#FFF5F3', '#F0FFF6', '#FFF9E8', '#F0F8FF'];
const DEFAULT_TAGS = ['Personal', 'Work', 'Ideas', 'Important', 'Todo'];

function getRandomPastel(index) {
  return pastelColors[index % pastelColors.length];
}

function extractImageUrls(html) {
  const imgUrls = [];
  if (!html) return imgUrls;
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('img').forEach(img => imgUrls.push(img.src));
  return imgUrls;
}

async function imageHandler() {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('http://localhost:3000/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.url) {
        const quill = this.quill;
        const range = quill.getSelection();
        quill.insertEmbed(range.index, 'image', data.url);
        quill.setSelection(range.index + 1);
      } else {
        alert('Failed to upload image');
      }
    } catch {
      alert('Error uploading image');
    }
  };
}

const sanitizeConfig = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'p', 'br', 'img'],
  allowedAttributes: {
    img: ['src', 'alt', 'width', 'height', 'style'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      float: [/^left$/, /^right$/],
      width: [/^\d+px$/],
      height: [/^\d+px$/],
    },
  },
};

export default function NotesDashboard({ onLogout }) {
  const [allNotes, setAllNotes] = useState([]);
  const [notes, setNotes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [searchFromDate, setSearchFromDate] = useState('');
  const [searchToDate, setSearchToDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState({ title: '', content: '', tags: [] });

  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Load notes once on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNotes();
        if (data.error) setError(data.error);
        else {
          setAllNotes(data);
          setNotes(data);
        }
      } catch {
        setError('Failed to load notes');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter notes locally based on search inputs
  useEffect(() => {
    const filtered = allNotes.filter(note => {
      const lowerQuery = searchQuery.toLowerCase();

      const matchesQuery =
        !searchQuery ||
        (note.title && note.title.toLowerCase().includes(lowerQuery)) ||
        (note.content && note.content.toLowerCase().includes(lowerQuery));

      const matchesTag = !searchTag || (note.tags && note.tags.includes(searchTag));

      const updatedAt = new Date(note.updatedAt);
      const from = searchFromDate ? new Date(searchFromDate) : null;
      const to = searchToDate ? new Date(searchToDate) : null;
      const matchesFrom = !from || updatedAt >= from;
      const matchesTo = !to || updatedAt <= to;

      return matchesQuery && matchesTag && matchesFrom && matchesTo;
    });
    setNotes(filtered);
  }, [allNotes, searchQuery, searchTag, searchFromDate, searchToDate]);

  const handleLogout = () => onLogout();

  const openEditModal = (note = { title: '', content: '', tags: [] }) => {
    setCurrentNote(note);
    setModalOpen(true);
  };
  const closeEditModal = () => {
    setModalOpen(false);
    setCurrentNote({ title: '', content: '', tags: [] });
  };
  const handleNoteChange = (field, value) => {
    setCurrentNote(prev => ({ ...prev, [field]: value }));
  };

  const saveNote = async () => {
    try {
      if (currentNote._id) {
        const originalNote = allNotes.find(note => note._id === currentNote._id);
        const originalContent = originalNote ? originalNote.content || '' : '';

        const oldImageUrls = extractImageUrls(originalContent);
        const newImageUrls = extractImageUrls(currentNote.content || '');
        const removedImages = oldImageUrls.filter(url => !newImageUrls.includes(url));

        for (const url of removedImages) {
          try {
            await fetch('http://localhost:3000/api/delete-image', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: url }),
            });
          } catch (error) {
            console.error('Failed to delete image:', url, error);
          }
        }

        await updateNote(currentNote._id, currentNote);
        setSnackbar({ open: true, message: 'Note updated successfully!' });
      } else {
        await createNote(currentNote);
        setSnackbar({ open: true, message: 'Note created successfully!' });
      }
      closeEditModal();
      // Reload notes for fresh state
      const data = await fetchNotes();
      setAllNotes(data);
    } catch {
      setSnackbar({ open: true, message: 'Error saving note' });
    }
  };

  const confirmDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteNote(id);
      setSnackbar({ open: true, message: 'Note deleted successfully!' });
      const data = await fetchNotes();
      setAllNotes(data);
    } catch {
      setSnackbar({ open: true, message: 'Error deleting note' });
    }
  };

  const handleCloseSnackbar = () => setSnackbar({ open: false, message: '' });

  const modules = {
    toolbar: {
      container: [
        ['bold', 'underline', 'italic'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['image'],
        [{ align: [] }],
      ],
      handlers: {
        image: imageHandler,
      },
    },
  };

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: '#f6f5f3', px: 4, py: 4, overflowX: 'hidden' }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 1 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          Notes
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <TextField size="small" placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ minWidth: 200 }} />
          <Autocomplete
            freeSolo
            options={DEFAULT_TAGS}
            value={searchTag}
            onChange={(event, newValue) => setSearchTag(newValue || '')}
            renderInput={(params) => <TextField {...params} label="Filter by tag" size="small" sx={{ width: 120 }} />}
          />
          <TextField size="small" type="date" value={searchFromDate} onChange={e => setSearchFromDate(e.target.value)} sx={{ width: 140 }} />
          <TextField size="small" type="date" value={searchToDate} onChange={e => setSearchToDate(e.target.value)} sx={{ width: 140 }} />
          <Button variant="outlined" onClick={() => openEditModal()}>
            New Note
          </Button>
          <Button variant="outlined" color="error" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box textAlign="center" mt={10}>
          <CircularProgress />
          <Typography mt={2}>Loading notes...</Typography>
        </Box>
      ) : error ? (
        <Typography color="error" align="center">{error}</Typography>
      ) : notes.length === 0 ? (
        <Typography align="center" sx={{ mt: 6 }}>
          No notes found.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {notes.map((note, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={note._id}>
              <Paper
                elevation={3}
                sx={{
                  backgroundColor: getRandomPastel(index),
                  height: 220,
                  minWidth: 250,
                  maxWidth: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 3,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 #fff',
                  userSelect: 'none',
                  transition: 'box-shadow 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 #fff',
                  },
                }}
                onClick={() => openEditModal(note)}
              >
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography
                    variant="h6"
                    noWrap
                    sx={{
                      fontWeight: 600,
                      userSelect: 'text',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    {note.title || 'Untitled'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      height: 130,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: 'vertical',
                      userSelect: 'text',
                      color: '#555',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      textAlign: 'justify',
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content || '&nbsp;', sanitizeConfig) }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <IconButton
                    size="small"
                    aria-label="edit note"
                    onClick={e => {
                      e.stopPropagation();
                      openEditModal(note);
                    }}
                    sx={{ color: '#555' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="delete note"
                    onClick={e => {
                      e.stopPropagation();
                      confirmDelete(note._id);
                    }}
                    sx={{ color: '#d33' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={modalOpen}
        onClose={closeEditModal}
        fullWidth
        maxWidth="sm"
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
            sx: { backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.15)' },
          },
        }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {currentNote._id ? 'Edit Note' : 'New Note'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            variant="standard"
            value={currentNote.title}
            onChange={e => handleNoteChange('title', e.target.value)}
            sx={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', mb: 3 }}
            inputProps={{ style: { fontSize: 20, fontWeight: 600 } }}
          />
          <Autocomplete
            multiple
            freeSolo
            options={DEFAULT_TAGS}
            value={currentNote.tags || []}
            onChange={(event, newValue) => handleNoteChange('tags', newValue)}
            renderInput={(params) => (
              <TextField {...params} variant="standard" label="Tags" placeholder="Select or add tags" sx={{ mb: 3 }} />
            )}
          />
          <Box sx={{ width: '100%', textAlign: 'left' }}>
            <ReactQuill
              theme="snow"
              value={currentNote.content}
              onChange={value => handleNoteChange('content', value)}
              modules={modules}
              formats={['bold', 'underline', 'italic', 'list', 'bullet', 'image', 'align']}
              style={{ minHeight: '200px', marginBottom: '1rem' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditModal} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={saveNote} variant="contained" sx={{ bgcolor: '#007AFF', textTransform: 'none', '&:hover': { bgcolor: '#005fcc' }, fontWeight: 600, px: 3 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
        action={
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleCloseSnackbar}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
