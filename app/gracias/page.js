export default function GraciasPage() {
  return (
    <div className="max-w-xl mx-auto p-12 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">¡Gracias por tu compra!</h1>
      <p className="text-gray-700 mb-6">
        Tu pago se ha procesado con éxito. En unos momentos tu acceso quedará habilitado en la plataforma.
      </p>
      <a
        href="/"
        className="inline-block bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg"
      >
        Volver al inicio
      </a>
    </div>
  );
}
