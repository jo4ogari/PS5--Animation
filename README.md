# Seção PS5

Abra `index.html` no navegador ou sirva esta pasta com um servidor HTTP local (por exemplo, Live Server). A seção ocupa a tela, com texto centralizado verticalmente à esquerda e vídeo menor à direita (62% da largura), seguindo a referência fornecida. Uma máscara suave e uma sombra branca interna integram as bordas ao fundo. `object-fit: contain` preserva o vídeo sem distorção ou corte. No celular, o texto fica acima do vídeo. HTML, CSS e JavaScript estão separados nos arquivos existentes.

GSAP, ScrollTrigger e fontes são carregados por CDN. Se as bibliotecas não carregarem, um controle nativo por scroll com CSS sticky mantém a experiência funcional.

## Navegação, busca e consoles

O cabeçalho fixo usa o logo enviado, recortando apenas a margem transparente via CSS. A busca abre ao clicar na barra ou pressionar `/`: mostra os destinos da página e filtra por texto, incluindo palavras acentuadas. Use as setas, Enter ou clique para navegar; Esc fecha o painel. No celular, a busca também dá acesso a todas as seções.

A seção abaixo do vídeo usa `ps5.webp` e `ps4.png`, com filtros Todos/PlayStation 5/PlayStation 4 e detalhes expansíveis. Os resultados da busca e os links do cabeçalho revelam a categoria correta antes de navegar.

`interface.js` concentra as novas interações e animações: entrada do cabeçalho, revelação escalonada dos títulos e cards, parallax das imagens, inclinação ao mover o mouse, indicador animado dos filtros, abertura da busca, detalhes e navegação suave. As animações decorativas respeitam `prefers-reduced-motion`. A lógica do vídeo continua isolada em `script.js`.

Validação: `node --check interface.js` e `node verify-interface.cjs`. O teste cobre busca, acentos, ausência de resultados, navegação por teclado, filtros, fechamento do painel e existência dos arquivos e destinos locais. Não houve navegador conectado para validar visualmente as animações e o layout desta etapa.

## Funcionamento

O vídeo permanece pausado. Depois de `loadedmetadata`, um playhead GSAP com `scrub: true` solicita o `currentTime` correspondente à posição do scroll. As solicitações são alinhadas aos frames de 60 fps, configurados por `data-fps` no HTML. `requestAnimationFrame` agrupa eventos e `seeked` libera a próxima busca, usando sempre a posição mais recente. Buscas interrompidas podem ser retomadas após um segundo. A lógica permite buscar com `readyState` igual a 1 para não bloquear durante buffering. Não há autoplay ou loop. O decodificador ainda pode terminar uma busca pendente quando a rolagem parar.

Em HTTP/HTTPS, o vídeo é carregado em um Blob antes da inicialização, eliminando a dependência de suporte a HTTP Range para retroceder. Se a transferência falhar ou ultrapassar 15 segundos, o código tenta a URL original. Em `file://`, o vídeo é aberto diretamente. O poster exibe o primeiro frame enquanto o arquivo carrega.

A seção fica fixa com `pin` por 3,5 alturas de viewport (mínimo de 2200 px). O fim é calculado a partir da duração e da taxa de frames do arquivo otimizado, sem faixa de áudio. Role para cima para reverter. A distância pode ser ajustada em `distanceForViewport`, no `script.js`.

## Vídeo otimizado para scroll

O MP4 original tem 241 frames a 24 fps e apenas um quadro-chave. A versão `controller-scroll-60fps.mp4` tem 603 frames a 60 fps (362 frames a mais), criados com interpolação de movimento. Todos os 603 frames são quadros-chave, sem B-frames, permitindo busca direta ao avançar ou retroceder. A resolução 1280 × 720 foi preservada. O arquivo tem aproximadamente 15,7 MB, e o original continua na pasta. A decodificação completa foi validada com FFmpeg sem erros, e uma amostra visual foi comparada ao original.

Para reproduzir a conversão com FFmpeg (foi usada a cópia instalada em `C:/Program Files/VMS/ffmpeg.exe`):

```powershell
ffmpeg -i "Video 1 (2).mp4" -an -vf "tpad=stop_mode=clone:stop_duration=0.1,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,trim=duration=10.05,setpts=PTS-STARTPTS" -c:v libx264 -preset fast -crf 20 -g 1 -keyint_min 1 -sc_threshold 0 -bf 0 -pix_fmt yuv420p -movflags +faststart "controller-scroll-60fps.mp4"
```

O HTML aponta para o arquivo otimizado com `data-fps="60"`. Os frames interpolados são sintetizados a partir do movimento original e podem apresentar pequenas deformações em peças que se cruzam. A codificação com quadros independentes reduz o custo de busca, mas a fluidez final também depende do navegador e do dispositivo.

## Verificação em navegador

- No topo, aguarde o carregamento e confira que o primeiro frame permanece parado.
- Role lentamente, pare, retroceda e faça saltos rápidos nas duas direções.
- Ao completar o trecho fixo, confira que o último frame permanece e a página é liberada.
- Retorne ao topo e confira que a desmontagem se reverte.
- Teste em desktop e em aparelhos reais com Safari/iOS e Chrome/Android, incluindo mudança de orientação. O vídeo usa `muted`, `playsinline` e não chama `play()`.
- Confirme o vídeo à direita, as bordas suavizadas em branco e o texto à esquerda; em telas de até 700 px, confira o texto acima do vídeo.

Não foi possível realizar inspeção visual neste ambiente, pois não havia navegador conectado. Execute `node --check script.js` e `node verify.cjs` para verificar sintaxe e lógica de controle. Os testes simulam GSAP e o controle nativo e cobrem avanço, retrocesso, espera por metadados, recuperação de busca e retenção do último frame; não validam o decodificador real ou a fluidez visual.

Referência: [documentação oficial do ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).
