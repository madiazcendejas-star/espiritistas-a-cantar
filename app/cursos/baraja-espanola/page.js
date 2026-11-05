'use client';

export default function PaginaBarajaEspanola() {
  const handleComprar = async () => {
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url; // Te redirige a la pasarela de pagos de Stripe
      } else {
        alert('Hubo un error al iniciar la compra.');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Taller de Baraja Española</h1>
      <p className="text-gray-600 mb-6">Accede a la grabación completa del taller y tu manual en PDF.</p>
      
      <button
        onClick={handleComprar}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition"
      >
        Comprar Acceso Inmediato
      </button>
    </div>
  );
}
