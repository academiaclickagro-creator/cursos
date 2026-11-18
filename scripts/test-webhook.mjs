/**
 * Script de simulación y testing para el Webhook de Mercado Pago
 * Ejecución: node scripts/test-webhook.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testWebhook(description, payload) {
  console.log(`\n======================================================`);
  console.log(`▶ EJECUTANDO: ${description}`);
  console.log(`======================================================`);

  try {
    const res = await fetch(`${BASE_URL}/api/webhooks/mercadopago`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    const data = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Respuesta:`, JSON.stringify(data, null, 2));

    return { status, data };
  } catch (error) {
    console.error(`Error de conexión al servidor (${BASE_URL}):`, error.message);
    console.log('Asegúrate de que el servidor esté corriendo (`npm run dev`).');
    return null;
  }
}

async function runSimulationSuite() {
  console.log('Iniciando batería de pruebas del Webhook de Mercado Pago...');
  console.log(`Objetivo: ${BASE_URL}/api/webhooks/mercadopago`);

  const randomId = Math.floor(100000 + Math.random() * 900000);
  const testEmail = `alumno.simulado.${randomId}@gmail.com`;

  // 1. Prueba de Pago RECHAZADO: No debe conceder acceso ni crear nada
  await testWebhook('1. Pago RECHAZADO (rejected) -> Debe ignorar y responder granted: false', {
    id: `TEST-REJ-${randomId}`,
    type: 'payment',
    _is_simulation: true,
    status: 'rejected',
    email: testEmail,
    amount: 35000,
  });

  // 2. Prueba de Pago PENDIENTE: No debe conceder acceso
  await testWebhook('2. Pago PENDIENTE (pending) -> No debe otorgar acceso aún', {
    id: `TEST-PEND-${randomId}`,
    type: 'payment',
    _is_simulation: true,
    status: 'pending',
    email: testEmail,
    amount: 35000,
  });

  // 3. Prueba de Pago APROBADO: Debe procesar, registrar matrícula y enviar email
  const approvedPaymentId = `TEST-APP-${randomId}`;
  await testWebhook('3. Pago APROBADO (approved) -> Procesa, enrola y despacha email', {
    id: approvedPaymentId,
    type: 'payment',
    _is_simulation: true,
    status: 'approved',
    email: testEmail,
    first_name: 'Carlos',
    last_name: 'Simulación',
    amount: 45000,
    course_id: '11111111-1111-1111-1111-111111111111',
  });

  // 4. Prueba de IDEMPOTENCIA: Reenviar el mismo pago aprobado
  await testWebhook('4. IDEMPOTENCIA (mismo payment_id) -> Debe detectar already_processed: true', {
    id: approvedPaymentId,
    type: 'payment',
    _is_simulation: true,
    status: 'approved',
    email: testEmail,
  });

  console.log('\n======================================================');
  console.log('✔ Simulación de Webhooks finalizada con éxito.');
  console.log('======================================================\n');
}

runSimulationSuite();
