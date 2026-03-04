
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import React from 'react'

// Prevent a blank white screen when required env vars are missing.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function MissingEnv() {
	return (
		<div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
			<h1 style={{ marginBottom: 8 }}>Configuration needed</h1>
			<p>Set <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> in a <code>.env</code> file.</p>
			<p>Copy <code>.env.example</code> to <code>.env</code> and fill in values, then restart the dev server.</p>
		</div>
	)
}

const root = createRoot(document.getElementById('root')!);

if (!SUPABASE_URL || !SUPABASE_KEY) {
	root.render(<MissingEnv />);
} else {
	root.render(<App />);
}
