import asyncio

HOST = '127.0.0.1'
PORT = 65432

async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """
    Corrotina chamada pelo Event Loop para cada nova conexão.
    """
    addr = writer.get_extra_info('peername')
    print(f"[NOVA CONEXÃO] {addr}")

    # 1) Ler dados do cliente
    data = await reader.read(1024)
    mensagem = data.decode()

    # 2) Simular processamento sem bloquear a thread principal
    await asyncio.sleep(5)

    # 3) Enviar resposta ao cliente
    resposta = f"Processado (async): {mensagem}"
    writer.write(resposta.encode())
    await writer.drain()

    # 4) Fechar conexão
    writer.close()
    await writer.wait_closed()

    print(f"[DESCONECTADO] {addr}")

async def main():
    """
    Ponto de entrada assíncrono: cria e inicia o servidor.
    """
    server = await asyncio.start_server(handle_client, HOST, PORT)

    print(f"[ASSÍNCRONO] Servidor rodando em {HOST}:{PORT} — Event Loop ativo.")

    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())