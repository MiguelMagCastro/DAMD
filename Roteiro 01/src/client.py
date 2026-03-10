import socket
import threading
import time

HOST = '127.0.0.1'
PORT = 65432

def enviar_tarefa(id_cliente):
    """
    Simula um cliente tentando acessar o sistema distribuído.
    """
    try:
        # Cria socket TCP
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.connect((HOST, PORT))
        
        mensagem = f"Tarefa do Cliente {id_cliente}"
        print(f"[CLIENTE {id_cliente}] Enviando: {mensagem}")
        
        client.send(mensagem.encode('utf-8'))
        
        # Espera resposta (Blocking I/O do lado do cliente)
        resposta = client.recv(1024).decode('utf-8')
        print(f"[CLIENTE {id_cliente}] Recebeu: {resposta}")
        
    except ConnectionRefusedError:
        print(f"[CLIENTE {id_cliente}] Erro: Servidor offline.")
    finally:
        client.close()

if __name__ == "__main__":
    print("--- DISPARANDO MÚLTIPLOS CLIENTES SIMULTANEAMENTE ---")
    
    # Criamos 3 clientes "falsos" tentando acessar ao mesmo tempo
    threads = []
    for i in range(1, 4):
        t = threading.Thread(target=enviar_tarefa, args=(i,))
        threads.append(t)
        t.start()
    
    # Aguarda todos terminarem
    for t in threads:
        t.join()
        
    print("--- TODOS OS CLIENTES FINALIZADOS ---")