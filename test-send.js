const { algorandClient } = require('./src/lib/infrastructure/clients/algorand-client');

async function test() {
  try {
    const to = "DIRECCION_DESTINO_DE_PRUEBA"; // reemplace por una dirección válida, incluso la misma de recompensas
    const amount = 1000; // 0.001 ALGO
    const result = await algorandClient.sendPayment(to, amount, "Test reward");
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
