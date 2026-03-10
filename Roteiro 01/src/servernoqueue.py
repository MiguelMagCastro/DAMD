import socket
import time

HOST = '127.0.0.1'
PORT = 65432

def processar_requisicao(conn, addr):
    print(f"--- [OCUPADO] Atendendo {addr} ---")
    # O servidor fica 'surdo' para novos aceites enquanto processa isso
    time.sleep(5) 
    conn.send(b"Atendido.")
    conn.close()
    print(f"--- [LIVRE] {addr} finalizado. ---\n")

def iniciar_servidor_intolerante():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    
    # O PARAMETRO MÁGICO: backlog=1
    # Significa: "Só aceito 1 pessoa na sala de espera."
    # O 3º cliente simultâneo receberá um "Não" na cara (Connection Refused).
    server.listen(1)
    
    print(f"[MODO SEM FILA] Servidor rodando em {HOST}:{PORT}")
    print("Se chegar muita gente, vai dar erro de conexão!")
    
    while True:
        conn, addr = server.accept()
        processar_requisicao(conn, addr)

if __name__ == "__main__":
    iniciar_servidor_intolerante()