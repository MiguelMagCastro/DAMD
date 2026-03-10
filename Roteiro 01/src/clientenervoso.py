import socket
import threading
import time

HOST = '127.0.0.1'
PORT = 65432

def cliente_nervoso(id_cliente):
    try:
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        
        # O TRUQUE: Timeout de 2 segundos.
        # Se o servidor (ou a fila do SO) não aceitar a conexão TCP
        # em 2 segundos, o cliente desiste e gera erro.
        client.settimeout(2)
        
        print(f"[CLIENTE {id_cliente:02d}] 🟡 Tentando entrar...")
        client.connect((HOST, PORT))
        
        # Se passou daqui, o SO aceitou a conexão (está no backlog ou sendo atendido)
        print(f"[CLIENTE {id_cliente:02d}] 🟢 Conectou! Esperando resposta...")
        
        # Agora espera os dados
        msg = client.recv(1024)
        print(f"[CLIENTE {id_cliente:02d}] 🏆 SUCESSO: {msg.decode()}")
        
    except socket.timeout:
        print(f"[CLIENTE {id_cliente:02d}] ⏱️ TIMEOUT: O servidor demorou demais para aceitar!")
    except ConnectionRefusedError:
        print(f"[CLIENTE {id_cliente:02d}] ⛔ RECUSADO: A fila estava cheia!")
    except Exception as e:
        print(f"[CLIENTE {id_cliente:02d}] ❌ ERRO: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    print("--- INICIANDO ATAQUE DE 10 CLIENTES SIMULTÂNEOS ---")
    
    threads = []
    # Dispara 10 clientes para garantir que a fila estoure
    for i in range(1, 201):
        t = threading.Thread(target=cliente_nervoso, args=(i,))
        threads.append(t)
        t.start()
        # Sem sleep entre eles, ou sleep muito curto
        
    for t in threads:
        t.join()