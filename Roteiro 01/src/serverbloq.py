import socket
import time

HOST = '127.0.0.1'
PORT = 65432

def processar_requisicao(conn, addr):
    """
    Mesma função de antes, simulando trabalho pesado (5s).
    """
    print(f"--- [INÍCIO] Atendendo {addr} ---")
    
    try:
        msg = conn.recv(1024).decode('utf-8')
        if msg:
            print(f"[{addr}] Processando: {msg} (Isso vai demorar 5s...)")
            
            # O servidor ESTÁ PRESO AQUI.
            # Nenhuma outra linha de código roda enquanto isso não acabar.
            time.sleep(5) 
            
            resposta = f"Processado (com atraso): {msg}".encode('utf-8')
            conn.send(resposta)
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        conn.close()
        print(f"--- [FIM] {addr} finalizado. Próximo! ---\n")

def iniciar_servidor_bloqueante():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen()
    
    print(f"[MODO BLOQUEANTE] Servidor rodando em {HOST}:{PORT}")
    print("Este servidor atende UM DE CADA VEZ (Fila Única).")
    
    while True:
        # 1. Aceita a conexão
        conn, addr = server.accept()
        
        # 2. Processa DIRETAMENTE no loop principal.
        # O loop 'while' para e espera essa função terminar.
        # Quem tentar conectar agora ficará na fila do TCP (backlog) esperando.
        processar_requisicao(conn, addr)

if __name__ == "__main__":
    iniciar_servidor_bloqueante()