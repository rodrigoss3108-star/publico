# Instagram Media Shell

Versão atual: **2.8.1**. A versão também aparece ao lado do nome do shell na barra superior.

Extensão local para Chrome que, dentro da página de um perfil do Instagram, abre um terminal verde e lista:

- os stories ativos do perfil, quando disponíveis para a sessão conectada;
- os destaques disponíveis para a conta conectada;
- as mídias existentes dentro de cada destaque;
- os posts e reels já carregados na grade do perfil;
- seções separadas para stories, destaques, posts e reels;
- carrosséis agrupados, com seleção individual ou do grupo inteiro;
- leitura correta de URLs de publicação com identificador longo, usando o shortcode canônico do Instagram;
- posts de mídia única selecionáveis diretamente, sem etapa de listagem;
- pasta de download selecionável no Explorador de Arquivos;
- reutilização automática da última pasta de download autorizada;
- criação e reutilização automática de uma subpasta com o nome do perfil dentro da pasta escolhida;
- marcação visual das mídias que já foram baixadas;
- logs persistentes e separados por perfil, com registro de operações, downloads e erros;
- botões **SHOW LOGS** e **COPY LOGS** para consultar ou copiar o diagnóstico da execução;
- botão `>_` isolado na área de ações ao lado do nome do perfil;
- seleção e download de várias mídias.

Ela usa somente a sessão já aberta em `instagram.com`. Não pede senha, não exporta cookies e não envia dados para servidores externos.

## Instalação no disco D:

Baixe `Instagram-Media-Shell.zip` para a pasta Downloads. Abra o PowerShell e execute:

```powershell
$Pacote = Join-Path $env:USERPROFILE "Downloads\Instagram-Media-Shell.zip"
$Base = "D:\Ferramentas"
$Destino = Join-Path $Base "Instagram-Media-Shell"

New-Item -ItemType Directory -Path $Base -Force | Out-Null

if (Test-Path $Destino) {
    Rename-Item -LiteralPath $Destino -NewName ("Instagram-Media-Shell-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

Expand-Archive -LiteralPath $Pacote -DestinationPath $Base -Force
Set-Location $Destino
Start-Process "chrome.exe" "chrome://extensions/"
```

No Chrome:

1. Ative **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação**.
3. Selecione `D:\Ferramentas\Instagram-Media-Shell`.
4. Abra ou atualize o Instagram e entre normalmente na sua conta.

## Uso

1. Abra a página principal de um perfil: `https://www.instagram.com/nome/`.
2. Clique em **>_ IG SHELL**, no canto inferior direito, ou no ícone da extensão.
3. O terminal executará `SCAN PROFILE` automaticamente.
4. Clique em **LOAD STORIES** ou em **LIST STORIES** para consultar os stories ativos.
5. Clique em **LIST MEDIA** no destaque desejado ou em **LOAD ALL HIGHLIGHTS**.
6. Posts de mídia única aparecem diretamente com sua caixa de seleção.
7. Somente carrosséis exibem **LIST MEDIA**; use-o para abrir as mídias do grupo.
8. Em carrosséis, marque apenas as mídias desejadas ou use **SELECT GROUP**.
9. Use **DOWNLOAD FOLDER** e escolha no Explorador de Arquivos a pasta da listagem.
10. Use **DOWNLOAD SELECTED** para baixar a seleção.
11. Em caso de erro, use **SHOW LOGS** para abrir o histórico do perfil e **COPY LOGS** para copiá-lo ao clipboard.

Ao iniciar o download, as caixas das mídias enviadas são desmarcadas
automaticamente. Assim, uma nova seleção pode ser preparada enquanto o lote
atual termina. As mídias concluídas recebem o marcador **BAIXADA**.

Na branch `lista_destaques`, o primeiro escaneamento lê os links de destaque já
renderizados na página do Instagram. Isso evita consultar o endpoint de perfil
que pode responder com HTTP 429 quando há limitação temporária de requisições.

Na branch `listar_posts`, os posts são identificados diretamente pelos links da
grade do perfil. A consulta dos arquivos é feita ao listar um carrossel ou ao
selecionar uma publicação de mídia única. Fotos e vídeos de um carrossel
permanecem dentro do mesmo grupo na interface.

Na branch `listar_storys`, a extensão detecta o acesso aos stories do perfil e,
ao executar **LIST STORIES**, consulta as mídias ativas usando a sessão atual.
Stories expirados ou indisponíveis para a conta conectada não são listados.
O `SCAN PROFILE` acompanha o perfil atual durante a navegação interna do
Instagram e descarta resultados atrasados do perfil visitado anteriormente.

Algumas URLs de publicação do Instagram contêm um identificador maior que o
shortcode canônico. A versão 2.8.0 usa os 11 primeiros caracteres para calcular
o ID numérico da mídia e tenta também recuperar os dados incorporados na página
da publicação se a API principal não responder. Isso evita consultar um ID
incorreto ao abrir determinados carrosséis.

Os logs são armazenados localmente no Chrome, separados pelo nome do perfil, e
mantêm até 500 registros por perfil. Eles incluem escaneamentos, consultas de
stories/destaques/publicações, seleção da pasta, downloads concluídos e erros.
O painel mostra os 200 registros mais recentes; **COPY LOGS** copia o histórico
completo daquele perfil.

O botão **DOWNLOAD FOLDER** abre o seletor nativo de diretórios. A pasta recebe
permissão de gravação somente após sua confirmação. A última pasta escolhida é
restaurada nas próximas listagens e continua como padrão até que você use o
botão para selecionar outra. O Chrome pode solicitar novamente a permissão de
gravação depois que a aba ou o navegador forem fechados.

Ao iniciar um download, a extensão cria dentro da pasta escolhida uma subpasta
com o nome do perfil, por exemplo `Instagram-Downloads\\nome_do_perfil`. Se essa
subpasta já existir, ela é reutilizada e os novos arquivos são salvos nela.

Ao abrir as mídias de um destaque ou carrossel, a rolagem interna permanece no
item acionado em vez de retornar ao início do terminal.

Para preparar uma pasta no disco D: antes de selecioná-la:

```powershell
$PastaDownloads = "D:\Instagram-Downloads"
New-Item -ItemType Directory -Path $PastaDownloads -Force | Out-Null
Set-Location $PastaDownloads
Start-Process "explorer.exe" $PastaDownloads
```

## Limitações

- Perfis privados só aparecem quando sua conta tem permissão para visualizá-los.
- Links de mídia podem expirar; faça o download na mesma sessão.
- O Instagram altera endpoints internos com frequência. Se a consulta deixar de funcionar, a extensão pode precisar de atualização.
- Use apenas para conteúdos que você tem autorização para salvar e respeite privacidade e direitos autorais.
