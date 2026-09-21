const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function App() {
  return (
    <div>
      <h1>AdmCursos UMSS</h1>
      <p>API: {API_URL}</p>
    </div>
  );
}

export default App;