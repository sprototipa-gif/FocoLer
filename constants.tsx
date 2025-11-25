import React from 'react';
import { Cat, Rocket, Sparkles, Trophy, Monitor, FileText, BarChart } from 'lucide-react';
import { LibraryData, ReadingProfile } from './types';

export const ACCESS_CODE = "focoler2025";

export const LIBRARY: LibraryData = {
  "Nivelamento": {
    icon: <BarChart className="w-6 h-6" />,
    color: "bg-slate-200 text-slate-700",
    texts: {
      facil: [
        "O menino joga bola no parque. O sol brilha forte no céu azul. A menina come uma maçã vermelha. O cachorro corre atrás do gato. A escola é grande e bonita. Eu gosto de ler livros. A chuva molha a terra. O passarinho canta na janela. Minha bicicleta é muito rápida. O bolo de chocolate é gostoso."
      ],
      medio: [
        "O menino joga bola no parque. O sol brilha forte no céu azul. A menina come uma maçã vermelha. O cachorro corre atrás do gato. A escola é grande e bonita. Eu gosto de ler livros. A chuva molha a terra. O passarinho canta na janela. Minha bicicleta é muito rápida. O bolo de chocolate é gostoso."
      ],
      dificil: [
        "O menino joga bola no parque. O sol brilha forte no céu azul. A menina come uma maçã vermelha. O cachorro corre atrás do gato. A escola é grande e bonita. Eu gosto de ler livros. A chuva molha a terra. O passarinho canta na janela. Minha bicicleta é muito rápida. O bolo de chocolate é gostoso."
      ]
    }
  },
  "Simulado": {
    icon: <FileText className="w-6 h-6" />,
    color: "bg-teal-100 text-teal-700",
    texts: {
      facil: [
        "PERA TOMATE BIFE SOPA JACARÉ PIPOCA SACOLA CABINE SUCO RECADO CASACO BALÉ GELO CAMELO TAÇA GOTA JUDÔ MARACUJÁ CANA BIGODE CONVITE MOEDA ESCRITOR INVERNO FÁBRICA PIJAMA BARULHO LEITURA DESENHO CONTRATO ÁRVORE IMAGEM SURPRESA VACINA CORAÇÃO AREIA VOLANTE MERCADO AVIÃO VESTIDO BANDEIRA MEL VITAMINA VÉU BORBOLETA PÉROLA MELODIA FLORESTA BALDE SÔ TECIDO FUMAÇA LUNETA COFRE LÂMINA PNEU VENTILADOR PI MÁGICA VERÃO PEIXE FRANGO CHAVE PULMÃO TÁXI VELA BOI TARTARUGA VENTO PONTE FILME JORNAL LÃ COLETE BOLSO BATATA CEBOLA XI CAMISETA SABONETE",
        "GOTA CAMELO BALÉ SOPA JACARÉ BIGODE SACOLA GELO SUCO TAÇA PIPOCA BIFE CASACO RECADO JUDÔ PERA CABINE TOMATE CANA MARACUJÁ FILME CEBOLA PEIXE BOLSO CHAVE BATATA JORNAL SABONETE VELA PONTE LÃ FRANGO BOI PULMÃO VENTO CAMISETA FUMAÇA XI VERÃO COFRE BANDEIRA LEITURA MOEDA VÉU BORBOLETA PÉROLA MELODIA FLORESTA BALDE SÔ TECIDO CONTRATO LUNETA CORAÇÃO LÂMINA PNEU VENTILADOR PI MÁGICA ESCRITOR VITAMINA CONVITE FÁBRICA INVERNO COLETE PIJAMA DESENHO MEL AREIA TARTARUGA VESTIDO ÁRVORE SURPRESA VACINA TÁXI BARULHO VOLANTE MERCADO AVIÃO IMAGEM"
      ],
      medio: [
        "PANA BUTELO FUMÊ TEBANO SINETE CAPÔ BIDÉ SIBILO PITU BACILO CEBO GAMETA LEVEDURA BABOSA VELO OURIÇO PETISQUEIRA XIBA PALETE RETÍFICA GÁ MUGIDO MONÓCULO NOZ CAPELETE BELICHE CALOMBO GÓ SECANTE RANGIDO TORRÃO COLHEIRA BOTICA GUIRLANDA ESPALHO BARBEADOR FISGO BREU ROCEGA TORTILHA JIMBRA CÓS PIPETA TIL CORNE BORDÔ GAMÃO TULHA CANOAGEM SINEIRA JUTA RAPEL BODA RUBIÃO CALÍGRAFO MÊ ALPACA JI PÁREO BAGEM",
        "BIDÉ SIBILO TEBANO CAPÔ SINETE PANA BUTELO PITU FUMÊ BACILO GÁ CEBO GAMETA VELO RETÍFICA PIPETA BOTICA XIBA PALETE BABOSA JUTA MUGIDO RAPEL CAPELETE ROCEGA BODA CÓS LEVEDURA GÓ CALÍGRAFO TIL RUBIÃO JI NOZ BAGEM FISGO BARBEADOR PETISQUEIRA PÁREO TORTILHA JIMBRA MÊ TORRÃO ALPACA CORNE BORDÔ GAMÃO TULHA SINEIRA CANOAGEM SECANTE CALOMBO MONÓCULO BELICHE RANGIDO BREU COLHEIRA OURIÇO GUIRLANDA ESPALHO"
      ],
      dificil: [
        "UM BEM PRECIOSO. OS ANIMAIS DA FLORESTA ESTAVAM MUITO PREOCUPADOS. HÁ MESES NÃO CHOVIA, E A ÁGUA DO RIO DIMINUÍA A CADA DIA. O QUE FAREMOS SE A ÁGUA ACABAR? PERGUNTOU O ELEFANTE. TEREMOS QUE PROCURAR ÁGUA EM OUTRO LUGAR SUGERIU A RAPOSA. DE JEITO NENHUM! NÓS VAMOS CUIDAR PARA QUE A ÁGUA NÃO ACABE. LOGO AS CHUVAS CHEGARÃO, MAS ATÉ LÁ SEREMOS CAUTELOSOS PARA PRESERVAR ESSE BEM TÃO PRECIOSO FALOU O LEÃO COM AUTORIDADE. CADA ANIMAL FEZ A SUA PARTE. O LEÃO COMEÇOU A TOMAR BANHOS MAIS RÁPIDOS, A ZEBRA PAROU DE LAVAR A PORTA DA SUA CASA TODA SEMANA E O ELEFANTE DEIXOU DE JOGAR ÁGUA POR TODOS OS CANTOS COM SUA TROMBA. OS DIAS FORAM PASSANDO, E A ÁGUA DO RIO AUMENTOU. QUANDO A PRIMAVERA CHEGOU, A CHUVA VEIO JUNTO, E O RIO VOLTOU A SER COMO ERA ANTES.",
        "VISITA AO BARBEIRO. BONINO ESTAVA ESCONDIDO ATRÁS DE UM ARBUSTO. ELE NÃO QUERIA QUE SUA MÃE O ACHASSE PARA LEVÁ-LO AO BARBEIRO. PORÉM, A MAMÃE PORCO-ESPINHO ERA ESPERTA E O ENCONTROU: VAMOS, O BARBEIRO VAI FAZER UM CORTE BEM BONITO. NÃO! EU NÃO PRECISO CORTAR O CABELO! DISSE O PEQUENO PORCO-ESPINHO. MAS NÃO ADIANTOU RECLAMAR, A MÃE O LEVOU ATÉ O SENHOR BODE, QUE TINHA MUITA EXPERIÊNCIA EM CORTAR CABELOS DE FILHOTES. BONINO GOSTOU DA BARBEARIA, QUE TINHA CADEIRAS EM FORMA DE FOGUETE. O BARBEIRO MOSTROU A BONINO UM ÁLBUM COM FOTOS DE CORTES QUE JÁ HAVIA FEITO: SÃO IRADOS! EU QUERO ESSE! O BARBEIRO FEZ SUA MÁGICA, E O PEQUENINO FICOU MUITO SATISFEITO COM SEU CORTE. BONINO NÃO SE ESCONDEU MAIS PARA NÃO IR AO BARBEIRO. AO CONTRÁRIO, ELE PEDIA PARA A MÃE LEVÁ-LO, E TODOS ADMIRAVAM SEUS PENTEADOS.",
        "UM BEIJA-FLOR MEDROSO. O BEIJA-FLOR ANIL ERA MUITO MEDROSO, ELE NÃO IA LONGE PORQUE TINHA MEDO DE SE PERDER. O MEDO DE ANIL FEZ COM QUE ELE CULTIVASSE UMA LINDA ROSEIRA PARA NÃO PRECISAR VOAR PARA OUTROS LUGARES EM BUSCA DO NÉCTAR DAS FLORES. ANIL, VOCÊ PRECISA PERDER ESSE MEDO. HÁ TANTOS LUGARES BONITOS PARA CONHECER NO MUNDO DISSE O CANARINHO. EU TENHO TUDO DE QUE PRECISO AQUI E NUNCA VOU SAIR DE CASA FALOU O BEIJA-FLOR. UM DIA, UMA FORTE SECA CASTIGOU A FLORESTA, E A ROSEIRA DE ANIL ACABOU MORRENDO. AO VER TODOS OS PÁSSAROS VOANDO EM BUSCA DE UM NOVO LAR, O BEIJA-FLOR NÃO TEVE ESCOLHA: ENFRENTOU O MEDO E VOOU PARA BEM LONGE. ANIL FEZ UMA INCRÍVEL VIAGEM E CONHECEU LUGARES BELÍSSIMOS, VIU CAMPOS COM AS MAIS VARIADAS FLORES E PROVOU O NÉCTAR DE TODAS ELAS."
      ]
    }
  },
  "Animais e Natureza": {
    icon: <Cat className="w-6 h-6" />,
    color: "bg-emerald-100 text-emerald-700",
    texts: {
      facil: [
        "O sapo mora na lagoa. Ele gosta de pular na água fria. O sapo come moscas e faz barulho de noite.",
        "A girafa tem um pescoço muito comprido. Ela come as folhas mais altas das árvores. Sua língua é azul.",
        "O cachorro late no portão. Ele quer brincar de bola. O rabo dele balança muito rápido quando está feliz.",
        "O gato dorme no sofá da sala. Ele gosta de beber leite morno. O gato faz miau quando sente muita fome.",
        "O peixinho nada no aquário limpo. Ele é laranja e muito pequeno. O peixe solta bolhas na água o dia todo.",
        "O pássaro voa no céu azul. Ele canta uma música bonita de manhã. O pássaro faz um ninho seguro na árvore.",
        "O cavalo corre livre no campo. Ele come a grama verde e fresca. O cavalo é um animal forte e muito veloz.",
        "A vaca dá leite para nós bebermos. Ela faz um som alto no pasto. A vaca tem manchas pretas e brancas no corpo.",
        "O coelho pula bem alto na grama. Ele adora comer cenoura laranja. O coelho tem orelhas grandes e muito macias.",
        "A borboleta é muito colorida. Ela voa de flor em flor no jardim. A borboleta tem asas leves e muito bonitas."
      ],
      medio: [
        "Os golfinhos são animais muito inteligentes que vivem no mar. Eles se comunicam através de sons e gostam de brincar com as ondas deixadas pelos barcos.",
        "O camaleão é famoso por mudar de cor. Ele faz isso para se esconder dos predadores ou para mostrar como está se sentindo para outros camaleões.",
        "As formigas são insetos muito fortes e organizados. Elas trabalham em equipe para carregar folhas e alimentos que são muito mais pesados que elas mesmas.",
        "O urso polar vive em lugares muito frios onde há gelo e neve. Ele tem uma grossa camada de gordura e pelos brancos para se proteger do frio intenso.",
        "As aranhas tecem teias incríveis com fios de seda. Elas usam essas teias para capturar insetos voadores que servem de alimento para elas sobreviverem.",
        "Os pinguins são aves que não voam, mas nadam muito bem. Eles deslizam no gelo com a barriga para se mover mais rápido e economizar energia no frio.",
        "O leão é conhecido como o rei da selva africana. Os leões vivem em grupos chamados alcateias e as leoas são as principais responsáveis pela caça.",
        "As corujas são aves noturnas com excelente visão. Elas conseguem girar a cabeça quase completamente para ver tudo ao seu redor sem mover o corpo.",
        "Os elefantes têm uma memória excelente e nunca esquecem. Eles usam suas longas trombas para pegar alimentos, beber água e até para fazer carinho.",
        "O canguru carrega seu filhote em uma bolsa na barriga. Eles possuem pernas traseiras muito fortes que permitem dar saltos longos e rápidos pela Austrália."
      ],
      dificil: [
        "As abelhas são essenciais para a polinização das plantas. Sem elas, muitas frutas e vegetais que comemos não existiriam. Elas vivem em colmeias organizadas onde cada uma tem sua função.",
        "Na floresta amazônica, a onça-pintada é a rainha. Ela é um felino solitário e excelente nadadora, caçando tanto na terra quanto na água para sobreviver no ambiente selvagem.",
        "A fotossíntese é o processo pelo qual as plantas produzem seu próprio alimento. Elas usam a luz do sol, água e dióxido de carbono para crescer e liberar oxigênio no ar.",
        "Os recifes de corais são ecossistemas marinhos vibrantes e cheios de vida. Eles abrigam milhares de espécies de peixes e protegem a costa contra a força das ondas do mar.",
        "A metamorfose da borboleta é um processo fascinante da natureza. Ela começa como uma lagarta, forma um casulo protetor e depois se transforma em um inseto alado.",
        "O ornitorrinco é um dos animais mais estranhos do mundo. Ele é um mamífero que bota ovos, tem bico de pato, rabo de castor e patas com membranas para nadar.",
        "As baleias-azuis são os maiores animais que já existiram na Terra. Seu coração é do tamanho de um carro pequeno e elas se alimentam de pequenos crustáceos chamados krill.",
        "O mimetismo é uma estratégia de defesa usada por muitos animais. Alguns insetos se parecem com gravetos ou folhas secas para não serem vistos pelos seus predadores naturais.",
        "A biodiversidade é a variedade de vida em nosso planeta. Proteger a biodiversidade é crucial para manter o equilíbrio dos ecossistemas e garantir um futuro saudável para todos.",
        "Os morcegos usam a ecolocalização para voar no escuro. Eles emitem sons que batem nos objetos e voltam aos seus ouvidos, permitindo que desviem de obstáculos com precisão."
      ]
    }
  },
  "Espaço e Ciência": {
    icon: <Rocket className="w-6 h-6" />,
    color: "bg-indigo-100 text-indigo-700",
    texts: {
      facil: [
        "A Lua brilha no céu escuro. O foguete sobe rápido para o espaço. O astronauta flutua sem peso.",
        "O Sol é uma grande estrela quente. Ele dá luz para a Terra. Não podemos olhar direto para ele.",
        "As estrelas piscam no céu de noite. Elas estão muito longe daqui. Existem bilhões de estrelas no universo.",
        "O planeta Terra é a nossa casa. Ele tem muita água azul. A Terra gira ao redor do Sol.",
        "O telescópio ajuda a ver longe. Com ele, vemos os planetas. Podemos ver as crateras da Lua.",
        "Um cometa tem uma cauda brilhante. Ele viaja rápido pelo espaço. É feito de gelo e poeira.",
        "O robô anda em outro planeta. Ele tira fotos das pedras. O robô envia as fotos para nós.",
        "A gravidade puxa tudo para baixo. Se pularmos, voltamos para o chão. No espaço não tem peso.",
        "Os alienígenas vivem na imaginação. Eles viajam em discos voadores. Nos filmes eles são verdes.",
        "O céu fica escuro à noite. Podemos ver as constelações. O Cruzeiro do Sul é famoso aqui."
      ],
      medio: [
        "Marte é conhecido como o Planeta Vermelho. Robôs enviados pelos humanos já andam por lá tirando fotos e estudando as pedras para saber se já existiu água.",
        "A gravidade é a força que nos mantém no chão. No espaço, a gravidade é diferente, por isso os astronautas flutuam e precisam se prender para dormir.",
        "O Sistema Solar tem oito planetas principais. Júpiter é o maior de todos eles, sendo um gigante gasoso com uma grande mancha vermelha que é uma tempestade.",
        "Um eclipse solar acontece quando a Lua passa na frente do Sol. Durante o dia, o céu fica escuro por alguns minutos e podemos ver a coroa solar.",
        "Os satélites giram ao redor da Terra no espaço. Eles são importantes para a previsão do tempo, para o GPS dos carros e para os sinais de televisão.",
        "A Via Láctea é a galáxia onde vivemos. Ela é formada por bilhões de estrelas, poeira e gás, e tem a forma de um espiral gigante girando no espaço.",
        "Os meteoros são pedaços de rocha que entram na atmosfera. Quando queimam no céu, chamamos de estrelas cadentes e muita gente faz um pedido ao vê-los.",
        "A Lua tem fases diferentes durante o mês. Às vezes ela está cheia e redonda, outras vezes parece uma banana, e às vezes ela nem aparece no céu.",
        "O som não se propaga no espaço vazio. Como não há ar para carregar as ondas sonoras, o espaço é um lugar de silêncio absoluto e eterno.",
        "Neil Armstrong foi o primeiro homem a pisar na Lua. Ele disse uma frase famosa sobre um pequeno passo para um homem e um grande salto para a humanidade."
      ],
      dificil: [
        "Buracos negros são regiões do espaço onde a gravidade é tão forte que nada consegue escapar, nem mesmo a luz. Eles continuam sendo um dos maiores mistérios da astronomia moderna.",
        "A Estação Espacial Internacional é um laboratório gigante que orbita a Terra. Cientistas de vários países moram lá para fazer experiências que não seriam possíveis aqui no chão.",
        "O Big Bang é a teoria científica sobre a origem do universo. Acredita-se que tudo começou com uma grande expansão a partir de um ponto extremamente quente e denso.",
        "A velocidade da luz é a coisa mais rápida que existe. A luz do Sol leva cerca de oito minutos para viajar pelo espaço e chegar até os nossos olhos na Terra.",
        "Exoplanetas são planetas que orbitam outras estrelas fora do nosso sistema solar. Os cientistas buscam exoplanetas parecidos com a Terra que possam ter água líquida e vida.",
        "As supernovas são explosões gigantescas de estrelas no fim da vida. Elas brilham mais que uma galáxia inteira por um tempo e espalham elementos químicos pelo universo.",
        "A energia solar é captada por painéis especiais. Essa tecnologia transforma a luz do Sol em eletricidade limpa, ajudando a proteger o meio ambiente da poluição.",
        "O campo magnético da Terra nos protege da radiação solar. Sem esse escudo invisível, a vida no nosso planeta seria muito difícil devido aos ventos solares perigosos.",
        "A aurora boreal é um show de luzes coloridas no céu. Ela acontece perto dos polos quando partículas do Sol batem na atmosfera da Terra, criando cores verdes e rosas.",
        "A matéria escura é algo que não podemos ver, mas sabemos que existe. Ela compõe a maior parte do universo e sua gravidade ajuda a manter as galáxias unidas."
      ]
    }
  },
  "Lendas e Fábulas": {
    icon: <Sparkles className="w-6 h-6" />,
    color: "bg-purple-100 text-purple-700",
    texts: {
      facil: [
        "A tartaruga apostou corrida com o coelho. O coelho dormiu no caminho. A tartaruga andou devagar e ganhou.",
        "O saci tem uma perna só. Ele usa um gorro vermelho e fuma cachimbo. O saci gosta de fazer bagunça.",
        "O lobo soprou a casa de palha. Os porquinhos correram com medo. A casa de tijolos não caiu.",
        "A chapeuzinho levou doces para a vovó. O lobo fingiu ser a vovó. O caçador salvou todo mundo.",
        "O menino gritou que viu o lobo. Ninguém acreditou nele depois. É feio contar mentiras para os outros.",
        "A fada do dente vem à noite. Ela troca o dente por uma moeda. A fada voa sem fazer barulho.",
        "O boto cor-de-rosa vive no rio. Ele vira um homem bonito. Ele gosta de dançar nas festas.",
        "A sereia canta no fundo do mar. Ela tem cauda de peixe. O canto dela é muito bonito.",
        "O sítio tem uma boneca de pano. Ela fala e é muito esperta. O nome dela é Emília.",
        "O gigante morava no pé de feijão. João subiu lá e viu tudo. Ele pegou a galinha de ouro."
      ],
      medio: [
        "Dizem que o Curupira é o protetor da floresta. Ele tem os pés virados para trás para confundir os caçadores que tentam seguir suas pegadas na mata.",
        "A cigarra cantou durante todo o verão enquanto a formiga trabalhava. Quando o inverno chegou, a cigarra sentiu frio, mas a formiga tinha comida guardada.",
        "A lenda da Vitória-Régia conta a história de uma índia que queria virar estrela. Ela mergulhou no reflexo da Lua no rio e foi transformada em uma linda planta aquática.",
        "O Negrinho do Pastoreio é uma lenda do sul do Brasil. Ele ajuda as pessoas a encontrarem coisas perdidas se você acender uma vela perto de um formigueiro.",
        "A Cuca é uma bruxa com cara de jacaré. Ela vive em uma caverna e faz poções mágicas em seu caldeirão, assustando as crianças que não querem dormir cedo.",
        "O Boitatá é uma cobra de fogo que protege as matas. Dizem que ele persegue quem coloca fogo na floresta e seus olhos brilham como chamas na escuridão.",
        "Pedro Malasartes é um personagem muito esperto do folclore. Ele sempre engana os ricos e avarentos para conseguir comida ou dinheiro usando sua inteligência e malandragem.",
        "A lebre e a tartaruga nos ensinam uma lição valiosa. Não adianta ser rápido se você for preguiçoso; a persistência e o esforço constante são o segredo para vencer.",
        "O leão prendeu um ratinho, mas o soltou. Dias depois, o leão caiu em uma rede e o ratinho roeu as cordas para salvá-lo, provando que pequenos amigos são grandes.",
        "Narciso era um jovem muito belo que se apaixonou pela própria imagem. Ele ficou olhando seu reflexo na água do lago até se transformar em uma flor."
      ],
      dificil: [
        "A lenda do Boto Cor-de-Rosa diz que, nas noites de festa junina, ele sai do rio transformado em um belo rapaz. Ele encanta as moças da festa e desaparece no rio antes do amanhecer.",
        "Segundo o folclore brasileiro, a Iara é uma sereia que vive nos rios da Amazônia. Seu canto é tão doce que hipnotiza os pescadores, atraindo-os para o fundo das águas profundas.",
        "A lenda do Guaraná conta sobre um indiozinho muito amado que foi picado por uma cobra. Seus olhos foram plantados na terra e deles nasceu a fruta que parece um olho humano.",
        "A Mula-sem-cabeça é uma mulher que foi amaldiçoada. Nas noites de quinta para sexta-feira, ela se transforma em um animal que solta fogo pelo pescoço e corre assustando a todos.",
        "As fábulas de Esopo são histórias antigas que usam animais para ensinar moral. Elas mostram comportamentos humanos como a ganância, a bondade e a esperteza através de bichos falantes.",
        "Hércules foi um herói da mitologia grega conhecido por sua força. Ele teve que realizar doze trabalhos impossíveis, como enfrentar o Leão de Nemeia e a Hidra de Lerna.",
        "A lenda de Atlântida fala de uma cidade antiga e avançada que afundou no mar. Até hoje, muitos exploradores sonham em encontrar as ruínas dessa civilização perdida nas profundezas.",
        "O Rei Arthur e os Cavaleiros da Távola Redonda buscavam o Santo Graal. Arthur provou ser o verdadeiro rei ao retirar a espada Excalibur de uma pedra onde estava presa.",
        "Robin Hood era um arqueiro habilidoso que vivia na floresta de Sherwood. Ele roubava dos ricos para dar aos pobres, lutando contra a injustiça do Príncipe João.",
        "A Caixa de Pandora é um mito grego sobre a curiosidade. Pandora abriu uma caixa proibida e libertou todos os males do mundo, restando apenas a esperança presa no fundo."
      ]
    }
  },
  "Esportes e Aventura": {
    icon: <Trophy className="w-6 h-6" />,
    color: "bg-orange-100 text-orange-700",
    texts: {
      facil: [
        "O menino chutou a bola no gol. A torcida gritou muito forte. O time ganhou o jogo e levantou a taça.",
        "Ana anda de bicicleta no parque. Ela usa capacete para proteger a cabeça. O vento bate no rosto dela.",
        "Nós vamos acampar na floresta. Vamos montar uma barraca verde. À noite faremos uma fogueira quentinha.",
        "O menino nada na piscina azul. Ele usa óculos de natação. Ele aprendeu a boiar na aula.",
        "Eu gosto de correr na pista. O tênis precisa estar amarrado. Chegar em primeiro lugar é legal.",
        "O skate tem quatro rodinhas. É preciso ter equilíbrio para andar. Cair faz parte de aprender.",
        "A menina faz aula de dança. Ela usa uma sapatilha rosa. A música toca e ela gira rápido.",
        "Vamos subir o morro a pé. A vista lá de cima é linda. Precisamos levar água na mochila.",
        "O jogo de vôlei é na praia. A areia é quente no pé. A bola passa por cima da rede.",
        "Pescar no rio é muito calmo. O barco balança devagar. É preciso ter paciência para pegar peixe."
      ],
      medio: [
        "O skate é um esporte radical que exige equilíbrio. Os skatistas fazem manobras incríveis em rampas e corrimãos, sempre treinando para não cair e se machucar.",
        "Nas Olimpíadas, atletas do mundo todo competem por medalhas. A natação é uma das provas mais rápidas, onde cada segundo faz diferença para vencer a corrida.",
        "O acampamento selvagem requer preparação e cuidado. É importante saber montar a barraca, fazer fogo com segurança e nunca deixar lixo na natureza para proteger os animais.",
        "O futebol é o esporte mais popular do Brasil. Onze jogadores em cada time tentam fazer gols, enquanto o goleiro faz defesas difíceis para proteger sua equipe.",
        "A escalada em rocha é um desafio de força e coragem. Os alpinistas usam cordas e equipamentos especiais para subir paredes verticais e alcançar o topo da montanha.",
        "O surf depende das condições do mar e do vento. O surfista rema até a onda, fica em pé na prancha e desliza pela água sentindo a força da natureza.",
        "A ginástica artística combina dança com acrobacias difíceis. Os atletas treinam muitas horas por dia para ter flexibilidade e força nos saltos e piruetas.",
        "Andar de caiaque no rio é uma aventura emocionante. É preciso remar com força para vencer a correnteza e usar o colete salva-vidas para garantir a segurança na água.",
        "O basquete é um jogo rápido onde a altura ajuda muito. Os jogadores driblam a bola e tentam acertar a cesta que fica no alto para marcar pontos.",
        "A corrida de Fórmula 1 envolve carros muito velozes. Os pilotos precisam de reflexos rápidos e uma equipe de mecânicos para trocar os pneus em poucos segundos."
      ],
      dificil: [
        "Escalar uma montanha exige preparo físico e mental. O ar fica rarefeito nas alturas, tornando a respiração difícil, mas a vista do topo compensa todo o esforço da subida.",
        "O surf de ondas gigantes acontece em lugares especiais como o Havaí. Os surfistas precisam ser rebocados por jet-skis porque as ondas são rápidas demais para remar com as mãos.",
        "A Maratona é uma corrida de longa distância muito exaustiva. Ela foi criada em homenagem a um soldado grego que correu quilômetros para avisar sobre a vitória em uma guerra.",
        "O paraquedismo é um esporte para quem gosta de adrenalina. Saltar de um avião e cair em queda livre antes de abrir o paraquedas requer muita coragem e treinamento.",
        "O triatlo é uma competição que une natação, ciclismo e corrida. Os atletas precisam ser bons em três esportes diferentes e ter muita resistência para chegar ao final.",
        "A Copa do Mundo de Futebol une nações a cada quatro anos. Países inteiros param para assistir aos jogos, torcendo com paixão e celebrando a cultura do esporte.",
        "O parkour é a arte de se mover rapidamente pela cidade. Os praticantes saltam muros, escalam prédios e rolam no chão, usando a arquitetura urbana como um grande obstáculo.",
        "O mergulho em águas profundas revela um mundo novo. Com cilindros de oxigênio, os mergulhadores exploram naufrágios e recifes, vendo peixes que nunca sobem à superfície.",
        "A espeleologia é a exploração de cavernas escuras e úmidas. Os exploradores rastejam por túneis apertados para descobrir lagos subterrâneos e formações rochosas milenares.",
        "O xadrez é considerado um esporte da mente. Dois jogadores usam estratégia e lógica para capturar o rei do adversário, antecipando jogadas como em uma batalha silenciosa."
      ]
    }
  },
  "Tecnologia": {
    icon: <Monitor className="w-6 h-6" />,
    color: "bg-blue-100 text-blue-700",
    texts: {
      facil: [
        "O robô limpa a casa sozinho. Ele tem luzes que piscam. Eu gosto de jogar videogame na televisão.",
        "O celular serve para ligar e mandar mensagem. Podemos tirar fotos e ver vídeos engraçados na tela.",
        "O tablet tem uma tela de vidro. Eu uso o dedo para desenhar. Posso ler livros digitais nele.",
        "O carro elétrico não faz barulho. Ele carrega na tomada. É bom para não poluir o ar.",
        "O drone voa como um helicóptero. Ele tira fotos lá do alto. O controle remoto guia o voo.",
        "A lâmpada acende quando aperto o botão. Antes usavam velas no escuro. A luz elétrica ajuda muito.",
        "O computador ajuda a fazer o dever. Ele tem teclado e mouse. A internet conecta tudo rápido.",
        "O relógio inteligente conta meus passos. Ele mostra as horas também. Ele avisa quando chega mensagem.",
        "A televisão mostra desenhos coloridos. O controle muda de canal. Podemos ver filmes com a família.",
        "O foguete leva satélites para o céu. A tecnologia espacial é difícil. Os cientistas estudam muito."
      ],
      medio: [
        "Os drones são pequenos aviões controlados por controle remoto. Eles podem filmar lugares altos ou até entregar pacotes pequenos em algumas cidades do futuro.",
        "A internet conecta computadores do mundo todo. Com ela, podemos aprender coisas novas, conversar com amigos distantes e assistir aulas sem sair de casa.",
        "A impressão 3D pode criar objetos de plástico. Ela constrói brinquedos, peças de máquinas e até casas, camada por camada, seguindo um desenho feito no computador.",
        "Os videogames modernos têm gráficos muito realistas. Eles permitem que a gente viva aventuras em mundos virtuais, resolvendo quebra-cabeças e jogando com amigos online.",
        "A energia solar usa a luz do sol para criar eletricidade. Painéis azuis nos telhados captam o calor e transformam em energia para ligar as luzes da casa.",
        "Os carros autônomos são veículos que dirigem sozinhos. Eles usam câmeras e sensores para ver a rua, desviar de pedestres e parar no sinal vermelho sem motorista.",
        "A realidade virtual usa óculos especiais. Quando colocamos os óculos, parece que estamos dentro do jogo ou visitando um lugar distante sem sair do quarto.",
        "Os robôs já trabalham em fábricas montando carros. Eles são fortes e não se cansam, fazendo tarefas repetitivas com muita rapidez e precisão o dia todo.",
        "O GPS ajuda os motoristas a não se perderem. Ele usa satélites no espaço para saber onde o carro está e mostra o melhor caminho no mapa.",
        "As baterias guardam energia para usar depois. Elas estão nos celulares, nos brinquedos e nos carros, permitindo que os aparelhos funcionem sem fio na tomada."
      ],
      dificil: [
        "A inteligência artificial ajuda médicos a descobrirem doenças mais rápido. Computadores analisam exames com uma precisão incrível, salvando muitas vidas nos hospitais ao redor do mundo.",
        "Carros elétricos estão se tornando populares porque não poluem o ar. Eles funcionam com baterias gigantes recarregáveis, parecidas com as que usamos em nossos brinquedos, mas muito mais potentes.",
        "A nanotecnologia estuda coisas extremamente pequenas. Cientistas criam robôs do tamanho de células que podem entrar no corpo humano para consertar problemas de saúde por dentro.",
        "O blockchain é uma tecnologia segura para guardar informações. É como um livro digital que ninguém pode apagar, usado para proteger dinheiro digital e contratos importantes.",
        "A biotecnologia mistura biologia com tecnologia. Ela permite criar plantas mais resistentes a pragas ou medicamentos novos estudando o DNA dos seres vivos no laboratório.",
        "A computação quântica é o futuro dos computadores super-rápidos. Eles poderão resolver problemas matemáticos complexos em segundos que hoje levariam milhares de anos para calcular.",
        "As cidades inteligentes usam sensores para melhorar a vida. Elas controlam o trânsito, a iluminação e o lixo automaticamente, economizando energia e tornando tudo mais eficiente.",
        "A segurança cibernética protege nossos dados na internet. É importante usar senhas fortes e antivírus para evitar que hackers roubem informações pessoais ou dinheiro dos bancos.",
        "A automação está mudando como trabalhamos. Máquinas inteligentes podem fazer tarefas perigosas ou chatas, deixando os humanos livres para trabalhos mais criativos e sociais.",
        "O turismo espacial logo será uma realidade para muitos. Empresas estão construindo naves para levar pessoas comuns para ver a Terra do espaço e flutuar na gravidade zero."
      ]
    }
  }
};

export const LEVELS: { [key: string]: ReadingProfile } = {
  PRE_LEITOR: { label: "Pré-Leitor", minPPM: 0, color: "text-red-500", bg: "bg-red-100" },
  INICIANTE: { label: "Leitor Iniciante", minPPM: 60, color: "text-yellow-600", bg: "bg-yellow-100" },
  FLUENTE: { label: "Leitor Fluente", minPPM: 90, color: "text-green-600", bg: "bg-green-100" }
};