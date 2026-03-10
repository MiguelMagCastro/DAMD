import socket
import threading
import time

# --- Configurações de Rede (A Camada de Transporte) ---
HOST = '127.0.0.1'  # Localhost (Nó local)
PORT = 65432        # Porta (Endereçamento do Processo)

def processar_requisicao(conn, addr):
    """
    Simula um trabalho pesado no servidor.
    Esta função roda dentro de uma THREAD isolada (Conceito de SO).
    """
    print(f"[NOVA CONEXÃO] {addr} conectado.")
    
    connected = True
    while connected:
        # A operação recv é BLOQUEANTE (Blocking I/O)
        # Se não tivéssemos threads, o servidor todo pararia aqui.
        msg = conn.recv(1024).decode('utf-8')
        
        if not msg:
            break
            
        print(f"[{addr}] Processando: {msg}")
        
        # Simula latência ou processamento pesado (5 segundos)
        time.sleep(5) 
        
        resposta = f"Processado: {msg}".encode('utf-8')
        conn.send(resposta)
        connected = False # Fecha após responder para simplificar

    conn.close()
    print(f"[DESCONECTADO] {addr}")

def iniciar_servidor():
    # 1. Criação do Socket (Abstração de Rede)
    # AF_INET = IPv4 (Camada de Rede)
    # SOCK_STREAM = TCP (Camada de Transporte - Confiável)
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    # 2. Bind (Vincular processo à porta)
    server.bind((HOST, PORT))
    
    # 3. Listen (Aguardando conexões)
    server.listen()
    print(f"[OUVINDO] Servidor rodando em {HOST}:{PORT}")
    
    while True:
        # 4. Accept (Bloqueante até alguém conectar)
        conn, addr = server.accept()
        
        # --- A MÁGICA DO SO AQUI ---
        # Em vez de processar aqui (o que bloquearia o próximo cliente),
        # delegamos para uma THREAD (SO).
        thread = threading.Thread(target=processar_requisicao, args=(conn, addr))
        thread.start()
        
        # Exibe quantas threads (clientes) estão ativas no SO
        print(f"[ATIVO] Conexões simultâneas: {threading.active_count() - 1}")

if __name__ == "__main__":
    print("--- INICIANDO SERVIDOR DE SISTEMAS DISTRIBUÍDOS ---")
    iniciar_servidor()