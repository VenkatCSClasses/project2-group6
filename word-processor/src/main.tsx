import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import App from './App.tsx'*/
import App from './IntegratedLayout.tsx' //Import the new IntegratedLayout component that combines the SearchSidebar, Editor, and Sources into one cohesive layout11
//import {WordEditor} from './Appv2' //Import the new IntegratedLayout component


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
