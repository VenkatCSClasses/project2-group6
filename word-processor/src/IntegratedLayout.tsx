import Editor from './App'; // Import the original Yoopta editor
import SearchSidebar from './SearchSidebar';
import './IntegratedStyles.css';

//IntegratedLayout combines the SearchSidebar and the Editor into a cohesive layout
export default function IntegratedLayout() {
 return (
   <div className="main-workspace-shell">
     <aside className="workspace-left">
       <SearchSidebar />
     </aside>
     <main className="workspace-right">
       <Editor />
     </main>
   </div>
 );
}
