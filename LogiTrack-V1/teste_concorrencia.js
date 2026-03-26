import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

if (!isMainThread) {
    const { orderId, token, index } = workerData;
    const startedAt = Date.now();

    try {
        const response = await fetch(`http://localhost:3001/api/orders/${orderId}/accept`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const body = await response.json();
        const finishedAt = Date.now();

        parentPort.postMessage({
            index,
            status: response.status,
            success: body.success,
            message: body.message,
            error: body.error || null,
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
        });
    } catch (error) {
        const finishedAt = Date.now();

        parentPort.postMessage({
            index,
            status: 0,
            success: false,
            message: error.message,
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
        });
    }
} else {
    const [, , orderId, ...tokens] = process.argv;

    if (!orderId || tokens.length === 0) {
        console.log('Uso: node teste_concorrencia.js <ORDER_ID> <TOKEN1> <TOKEN2> ...');
        process.exit(1);
    }

    console.log(`Disparando ${tokens.length} entregadores simultâneos para o pedido ${orderId}\n`);

    const promises = tokens.map((token, i) => {
        return new Promise((resolve) => {
            const worker = new Worker(__filename, {
                workerData: {
                    orderId,
                    token,
                    index: i + 1,
                },
            });

            worker.on('message', resolve);
            worker.on('error', (err) => {
                resolve({
                    index: i + 1,
                    status: 0,
                    success: false,
                    message: err.message,
                    startedAt: Date.now(),
                    finishedAt: Date.now(),
                    durationMs: 0,
                });
            });
        });
    });

    const results = await Promise.all(promises);

    results.forEach((r) => {
        console.log(
            `Entregador ${r.index} | HTTP ${r.status} | success: ${r.success} | ${r.durationMs}ms | "${r.message}"`
        );
    });

    const successCount = results.filter((r) => r.success).length;
    const minStart = Math.min(...results.map((r) => r.startedAt));
    const maxStart = Math.max(...results.map((r) => r.startedAt));

    console.log('\n--- Resumo ---');
    console.log(`Total de entregadores: ${results.length}`);
    console.log(`Aceitações registradas: ${successCount}`);
    console.log(`Janela de simultaneidade: ${maxStart - minStart}ms`);

    if (successCount === 1) {
        console.log('CORRETO: exatamente 1 aceitação.');
    } else {
        console.log('ERRO: quantidade de aceitações diferente de 1.');
    }
}