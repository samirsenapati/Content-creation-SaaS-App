const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory database (replace with real DB in production)
const users = [];
const todos = [];
let nextUserId = 1;
let nextTodoId = 1;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: nextUserId++,
      name: name || email.split('@')[0],
      email,
      password: hashedPassword
    };
    
    users.push(user);
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// Get todos
app.get('/api/todos', authenticateToken, (req, res) => {
  const userTodos = todos.filter(t => t.userId === req.user.id);
  res.json({ success: true, todos: userTodos });
});

// Create todo
app.post('/api/todos', authenticateToken, (req, res) => {
  const { text } = req.body;
  
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Todo text required' });
  }
  
  const todo = {
    id: nextTodoId++,
    userId: req.user.id,
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  todos.push(todo);
  res.json({ success: true, todo });
});

// Update todo
app.put('/api/todos/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id && t.userId === req.user.id);
  
  if (!todo) {
    return res.status(404).json({ success: false, error: 'Todo not found' });
  }
  
  if (req.body.text !== undefined) todo.text = req.body.text;
  if (req.body.completed !== undefined) todo.completed = req.body.completed;
  
  res.json({ success: true, todo });
});

// Delete todo
app.delete('/api/todos/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex(t => t.id === id && t.userId === req.user.id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Todo not found' });
  }
  
  todos.splice(index, 1);
  res.json({ success: true, message: 'Todo deleted' });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});