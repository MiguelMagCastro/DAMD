\# Reflexão — Roteiro 02: Transparência em Sistemas Distribuídos



\## 1. Síntese



Entre os 7 tipos de transparência, eu considero a \*\*transparência de relocação\*\* a mais difícil de implementar corretamente em um sistema real. Diferente da migração, em que o recurso muda de lugar entre uma execução e outra, a relocação exige que a mudança aconteça \*\*durante o uso\*\*, sem interromper a operação do cliente. Isso torna necessário controlar estados intermediários, reconexão e possível reenvio de mensagens.



No código da Tarefa 4, isso aparece claramente na máquina de estados `MIGRATING -> RECONNECTING -> CONNECTED`. Esse fluxo mostra que não basta apenas “mover” a conexão; é preciso preservar continuidade, ordem e consistência da comunicação. Além disso, existe o risco de duplicidade ou perda de mensagens, o que mostra que a dificuldade não é só de infraestrutura, mas também de \*\*semântica de comunicação distribuída\*\*.



Outro ponto que torna essa transparência difícil é que ela depende muito de mecanismos complementares, como \*\*bufferização\*\*, protocolo de confirmação e idempotência. Sem isso, a aplicação pode até parecer transparente em casos simples, mas falhar em cenários reais de latência, queda de conexão ou retransmissão.



Por isso, tecnicamente, relocação me parece a mais complexa: ela exige combinar \*\*estado explícito, tolerância a falhas, consistência e continuidade operacional\*\* ao mesmo tempo.



---



\## 2. Trade-offs



Um exemplo concreto é um \*\*jogo online multiplayer\*\*. Nesse tipo de sistema, esconder completamente a distribuição pode prejudicar a experiência do usuário, porque faria parecer que tudo é instantâneo e local, quando na prática existem servidor remoto, latência de rede e possibilidade de perda de pacotes. Se o sistema mascarar isso demais, o jogador não entende por que uma ação atrasou ou por que houve dessincronização.



Nesse caso, uma transparência excessiva reduziria a \*\*resiliência percebida\*\*. É melhor que o sistema seja honesto e mostre indicadores como ping alto, reconectando ou perda de conexão. Isso ajuda o usuário a interpretar o problema corretamente e evita a sensação de bug “misterioso” ou falha inexplicável.



Esse raciocínio se conecta com a ideia mostrada na Tarefa 7, em que o `anti\_pattern.py` trata uma chamada remota como se fosse local. Em um jogo ou aplicativo em tempo real, isso é perigoso porque ignora propriedades da \*\*computação distribuída\*\*, como latência variável e falhas parciais.



Portanto, em alguns sistemas, esconder demais a distribuição piora a robustez da experiência. Um design melhor é expor de forma controlada alguns sinais de rede e estado do sistema, para que o usuário consiga reagir melhor a falhas.



---



\## 3. Conexão com Labs anteriores



O conceito de `async/await`, estudado no Lab 02, se conecta diretamente com a decisão de \*\*quebrar a transparência conscientemente\*\* na Tarefa 7. Quando uma função é declarada como `async`, o código já deixa explícito para quem chama que aquela operação pode suspender a execução, depender de I/O e demorar mais do que uma chamada local comum.



Isso é importante porque uma chamada remota não tem as mesmas características de uma chamada local. Ao usar `await`, o programador reconhece explicitamente a presença de \*\*latência de rede\*\*, possibilidade de timeout e necessidade de tratamento assíncrono. Ou seja, o `async/await` é uma forma de tornar visível que existe distribuição por trás da operação.



No exemplo `fetch\_user\_remote`, o próprio nome da função e seu contrato com `Optional\[dict]` deixam claro que pode haver falha ou indisponibilidade. Isso é melhor do que fingir transparência total, pois obriga o chamador a lidar com cenários reais de sistemas distribuídos.



Assim, o Lab 02 ensinou a estrutura técnica para lidar com operações assíncronas, e a Tarefa 7 mostrou o motivo arquitetural disso: às vezes, \*\*não esconder totalmente a distribuição é a decisão correta de design\*\*.



---



\## 4. GIL e multiprocessing



A Tarefa 6 usa `multiprocessing` em vez de `threading` porque o objetivo é demonstrar uma \*\*race condition real\*\* entre unidades de execução independentes. Em Python, existe o \*\*GIL (Global Interpreter Lock)\*\*, que é um mecanismo do CPython que permite que apenas uma thread execute bytecode Python por vez dentro do mesmo processo.



Isso interfere na demonstração porque, embora threads ainda possam ter problemas de concorrência, o GIL reduz o paralelismo real e pode mascarar ou tornar menos reproduzível uma condição de corrida. Para fins didáticos, isso seria ruim, porque a ideia do laboratório é mostrar concorrência distribuída de forma clara e próxima do que acontece em sistemas reais.



Já com `multiprocessing`, cada processo possui seu próprio espaço de memória e seu próprio interpretador, logo também tem seu próprio GIL. Isso faz com que a disputa pelo recurso compartilhado armazenado no Redis aconteça de maneira mais parecida com o cenário de \*\*múltiplos processos ou múltiplas máquinas\*\* acessando o mesmo estado externo.



Por isso, `multiprocessing` foi a escolha correta: ele evidencia melhor a necessidade de um \*\*lock distribuído\*\* e mostra por que um `threading.Lock()` local não resolve o problema em aplicações distribuídas.



---



\## 5. Desafio técnico



Uma dificuldade técnica que pode ocorrer nesse laboratório é o \*\*provisionamento e conexão com o Redis Cloud\*\*, principalmente na configuração do `.env` e nos parâmetros corretos da conexão. Um erro comum seria informar host, porta ou senha incorretos, ou ainda ativar TLS de forma errada, o que causaria falhas como erro de autenticação ou erro de conexão.



O processo de diagnóstico, nesse caso, começa validando as variáveis `REDIS\_HOST`, `REDIS\_PORT` e `REDIS\_PASSWORD`, e depois executando o arquivo de teste de conexão com `r.ping()`. Esse teste é importante porque separa se o problema está no código das tarefas ou apenas na infraestrutura/configuração do ambiente.



Outro ponto importante seria observar a configuração `ssl=False`, já que o roteiro informa que o plano gratuito Essentials não usa TLS. Se esse detalhe for ignorado, a conexão pode falhar mesmo com as credenciais corretas. Isso mostra a importância de entender não só o código, mas também os aspectos de \*\*configuração distribuída e integração com serviços externos\*\*.



Mesmo quando não há erro, a parte mais interessante do laboratório é perceber a separação entre \*\*lógica computacional stateless\*\* e \*\*armazenamento stateful\*\*. A Tarefa 3 deixa isso muito claro, porque a sessão continua existindo mesmo após o encerramento de um processo e a entrada de outro.

