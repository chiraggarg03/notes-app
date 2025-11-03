const API_BASE_URL = 'http://3.110.114.167:3000'; // your backend URL

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export async function registerUser(userData) {
  const resp = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return resp.json();
}

export async function loginUser(credentials) {
  const resp = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return resp.json();
}

export async function fetchNotes() {
  const resp = await fetch(`${API_BASE_URL}/notes`, {
    headers: { ...getAuthHeaders() },
  });
  return resp.json();
}

export async function createNote(noteData) {
  const resp = await fetch(`${API_BASE_URL}/notes`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(noteData),
  });
  return resp.json();
}

export async function updateNote(id, noteData) {
  const resp = await fetch(`${API_BASE_URL}/notes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(noteData),
  });
  return resp.json();
}

export async function deleteNote(id) {
  const resp = await fetch(`${API_BASE_URL}/notes/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return resp.json();
}


// Additional API functions for create/update/delete notes can be added similarly.
