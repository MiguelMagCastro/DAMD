# RELATORIO

## Questão 1 — Backlog e Recusa de Conexões

No teste com o `servergargalo.py`, o `clientenervoso.py` apresentou vários `Timeout`, enquanto apenas poucas conexões chegaram a ser efetivamente atendidas pelo servidor. Isso ocorreu porque o `servergargalo.py` utiliza `listen(1)`, ou seja, sinaliza ao Sistema Operacional uma fila de conexões pendentes (*backlog*) muito pequena. Assim, o servidor consegue manter apenas uma conexão em atendimento e pouquíssimas aguardando na fila. Quando muitos clientes tentam se conectar ao mesmo tempo, a fila se esgota rapidamente. Nesse cenário, conexões adicionais podem ser recusadas imediatamente ou permanecer aguardando até expirar o tempo limite do cliente. :contentReference[oaicite:2]{index=2}

Nos logs observados, o servidor registrou o atendimento de apenas dois clientes, enquanto os demais clientes do `clientenervoso.py` terminaram com `Timeout`. Isso mostra que o gargalo não estava no cliente, mas sim na limitação do servidor monotarefa combinada com a capacidade reduzida da fila TCP. Como o atendimento é bloqueante e sequencial, cada conexão ocupa o servidor por tempo suficiente para impedir que as próximas sejam aceitas rapidamente. Com isso, várias tentativas excedem o tempo máximo de espera antes mesmo de serem processadas. :contentReference[oaicite:3]{index=3}

Já no teste com o `server.py`, a situação é diferente porque o servidor delega cada conexão para uma *thread* separada. Dessa forma, a thread principal pode continuar chamando `accept()` e retirando conexões da fila rapidamente, evitando o acúmulo excessivo no *backlog*. O resultado prático é que os clientes conseguem se conectar quase instantaneamente, sem sofrer os mesmos `Timeout` observados no servidor gargalo. Em outras palavras, o `server.py` reduz a pressão sobre a fila TCP porque aceita conexões concorrentes em vez de processá-las estritamente uma por vez. :contentReference[oaicite:4]{index=4}

Também é importante considerar a variabilidade entre sistemas operacionais. O próprio roteiro destaca que o parâmetro passado para `listen()` é tratado pelo kernel como uma dica, e não como um limite rígido. Por isso, dependendo do sistema, o esgotamento do *backlog* pode aparecer como `ConnectionRefusedError`, como `Timeout`, ou como uma combinação dos dois. No experimento realizado, o comportamento predominante foi `Timeout`, o que é compatível com essa variação experimental esperada. O ponto central permanece o mesmo: sob carga suficiente, a fila TCP se esgota e novas conexões deixam de ser atendidas em tempo hábil. :contentReference[oaicite:5]{index=5}

## Questão 2 — Custo de Recursos: Threads vs. Event Loop

No teste com o `server.py`, o número máximo de conexões/threads simultâneas observado foi **10**. Esse dado experimental é importante porque mostra que, na abordagem multithread, cada cliente atendido concorrentemente tende a consumir uma thread adicional criada e gerenciada pelo Sistema Operacional. Como cada thread possui sua própria pilha de memória (*stack*), o consumo total de memória cresce conforme aumenta o número de conexões simultâneas. Além disso, o processador precisa realizar trocas de contexto (*context switch*) entre essas threads, aumentando o custo de CPU. :contentReference[oaicite:6]{index=6}

Na prática, isso significa que o modelo multithread funciona bem para cargas pequenas ou moderadas, mas se torna progressivamente mais custoso à medida que o número de clientes cresce. Mesmo quando as threads passam boa parte do tempo bloqueadas em operações de I/O, elas continuam existindo como entidades do Sistema Operacional, ocupando memória e exigindo gerenciamento de escalonamento. No experimento, o servidor chegou a manter 10 conexões simultâneas, o que já evidencia esse crescimento de recursos proporcional ao número de clientes.

Na abordagem assíncrona com `asyncio`, o modelo muda: em vez de criar uma thread por conexão, o servidor utiliza uma única thread com um *Event Loop* para coordenar múltiplas conexões simultaneamente. Quando uma operação de I/O precisa aguardar, o laço de eventos não bloqueia a execução inteira; ele apenas suspende aquela corrotina e continua atendendo as demais. Isso reduz drasticamente o custo de memória, pois não há necessidade de manter várias pilhas de thread no SO, e também reduz o custo de CPU com trocas de contexto. O roteiro inclusive destaca que, nessa etapa, os 10 clientes devem ser atendidos concorrentemente com uma única thread ativa no processo Python. :contentReference[oaicite:7]{index=7}

Portanto, com base no experimento, a principal diferença é que o modelo com threads melhora a concorrência, mas cresce em consumo de memória e overhead de CPU conforme o número de conexões aumenta. Já o modelo assíncrono tende a escalar melhor para grande quantidade de conexões simultâneas porque concentra o gerenciamento em uma única thread e múltiplas corrotinas leves. Assim, o *Event Loop* oferece uma concorrência mais eficiente em termos de recursos, especialmente quando a carga é dominada por operações de rede e espera de I/O. :contentReference[oaicite:8]{index=8}


## Desafio Extra

Foi realizado um teste de carga modificando o `clientenervoso.py` para disparar **200 conexões simultâneas** contra o `server_async.py`.

O servidor assíncrono conseguiu manter o atendimento concorrente sem criar uma thread por cliente, utilizando o modelo de Event Loop com corrotinas. Esse resultado reforça a principal vantagem da abordagem assíncrona: maior escalabilidade com menor custo de memória e menor overhead de troca de contexto em comparação ao modelo multithread.

**Screenshot do teste:**  
![Teste com 200 conexões simultâneas](./img/resultado%20teste.png)