import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Paleta de Cores Executiva Nobre
    BG_COLOR = RGBColor(10, 14, 26)       # #0A0E1A (Azul Marinho Quase Preto)
    CARD_BG = RGBColor(18, 26, 46)        # #121A2E (Vidro Escuro / Card)
    GOLD = RGBColor(245, 158, 11)         # #F59E0B (Dourado Âmbar)
    GOLD_LIGHT = RGBColor(253, 230, 138)  # #FDE68A (Dourado Suave)
    WHITE = RGBColor(255, 255, 255)       # Branco
    SLATE = RGBColor(148, 163, 184)       # #94A3B8 (Texto Secundário)
    BORDER_COLOR = RGBColor(38, 52, 85)   # #263455
    CARD_HIGHLIGHT = RGBColor(28, 38, 68)

    # Imagens Geradas
    img_capa = r"C:\Users\lynx\.gemini\antigravity-ide\brain\1ad8aa03-3e06-4c3b-8441-16b1bfc0114b\horeb_apresentacao_capa_pt_1790726217722.jpg"
    img_pastoral = r"C:\Users\lynx\.gemini\antigravity-ide\brain\1ad8aa03-3e06-4c3b-8441-16b1bfc0114b\painel_pastoral_pt_1790726242788.jpg"
    img_gestao = r"C:\Users\lynx\.gemini\antigravity-ide\brain\1ad8aa03-3e06-4c3b-8441-16b1bfc0114b\gestao_financeira_eventos_pt_1790726271005.jpg"

    def add_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="PLATAFORMA HOREB • APRESENTAÇÃO PASTORAL"):
        # Categoria / Tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.5), Inches(0.4))
        ctf = cat_box.text_frame
        ctf.word_wrap = True
        cp = ctf.paragraphs[0]
        cp.text = category_text.upper()
        cp.font.name = "Segoe UI"
        cp.font.size = Pt(11)
        cp.font.bold = True
        cp.font.color.rgb = GOLD

        # Título Principal
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.5), Inches(0.8))
        ttf = title_box.text_frame
        ttf.word_wrap = True
        tp = ttf.paragraphs[0]
        tp.text = title_text
        tp.font.name = "Segoe UI"
        tp.font.size = Pt(26)
        tp.font.bold = True
        tp.font.color.rgb = WHITE

    # =========================================================================
    # SLIDE 1: CAPA
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_background(s1)

    # Imagem da capa (à direita)
    if os.path.exists(img_capa):
        s1.shapes.add_picture(img_capa, Inches(6.4), Inches(1.1), Inches(6.2), Inches(5.3))

    # Textos da capa (à esquerda)
    t1_box = s1.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(5.3), Inches(5.2))
    tf1 = t1_box.text_frame
    tf1.word_wrap = True

    p = tf1.paragraphs[0]
    p.text = "PLATAFORMA ECLESIÁSTICA HOREB"
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = GOLD

    p = tf1.add_paragraph()
    p.text = "A Tecnologia a Serviço do Reino"
    p.font.name = "Segoe UI"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.space_after = Pt(14)

    p = tf1.add_paragraph()
    p.text = "Gestão ministerial de excelência aliada ao acolhimento contínuo de almas na era digital."
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.color.rgb = SLATE
    p.space_after = Pt(24)

    p = tf1.add_paragraph()
    p.text = "“A tecnologia não substitui o pastor; ela capacita o ministério a alcançar a ovelha que está sofrendo em silêncio.”"
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.italic = True
    p.font.color.rgb = GOLD_LIGHT
    p.space_after = Pt(20)

    p = tf1.add_paragraph()
    p.text = "Apresentação Oficial para Pastores Presidentes, Bispos e Diretorias de Igrejas"
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 2: O GRANDE DILEMA DO MINISTÉRIO PASTORAL
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_background(s2)
    add_header(s2, "O Diagnóstico: O Abandono Silencioso e a Sobrecarga Pastoral")

    # Card Estatística Central
    c_top = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(11.73), Inches(1.3))
    c_top.fill.solid()
    c_top.fill.fore_color.rgb = CARD_HIGHLIGHT
    c_top.line.color.rgb = GOLD
    c_top.line.width = Pt(1.5)
    ctf = c_top.text_frame
    ctf.word_wrap = True
    cp = ctf.paragraphs[0]
    cp.text = "O DESAFIO DA 'PORTA DOS FUNDOS' NA IGREJA:"
    cp.font.name = "Segoe UI"
    cp.font.size = Pt(12)
    cp.font.bold = True
    cp.font.color.rgb = GOLD
    cp2 = ctf.add_paragraph()
    cp2.text = "Mais de 40% das pessoas que se afastam da igreja não saem por rebeldia, mas por solidão, crise emocional não notada ou ausência de acolhimento no momento mais agudo da dor."
    cp2.font.name = "Segoe UI"
    cp2.font.size = Pt(14)
    cp2.font.color.rgb = WHITE

    # 3 Colunas de Gargalos Reais
    cards_data = [
        ("Sobrecarga da Liderança", "O pastor titular e sua equipe têm coração pastoral, mas o dia só tem 24h. Centenas de mensagens se acumulam sem resposta humanizada a tempo."),
        ("Comunicação Caótica", "Avisos espirituais e pedidos urgentes de oração se perdem no ruído de grupos paralelos de WhatsApp, sem histórico e sem sigilo ético."),
        ("Ausência de Indicadores", "Dificuldade em acompanhar a frequência das células nos lares e emitir comprovantes confiáveis de dízimos para a declaração de Imposto de Renda.")
    ]

    for i, (title, desc) in enumerate(cards_data):
        left_pos = Inches(0.8 + i * 4.0)
        c = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(3.4), Inches(3.73), Inches(3.3))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = BORDER_COLOR
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = f"0{i+1}"
        p.font.name = "Segoe UI"
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_after = Pt(6)

        p = tf.add_paragraph()
        p.text = title
        p.font.name = "Segoe UI"
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.space_after = Pt(10)

        p = tf.add_paragraph()
        p.text = desc
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 3: O QUE É O HOREB? UMA SOLUÇÃO MINISTERIAL COMPLETA
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_background(s3)
    add_header(s3, "O Que é o Horeb: Um Ecossistema Ministerial Integrado")

    pilares = [
        ("01. Cuidado de Almas 24/7", 
         "Aconselhamento bíblico com Inteligência Artificial humanizada que escuta, ora pelo membro e identifica crises emocionais em tempo real."),
        ("02. Comunhão e Discipulado", 
         "Localização de células nos lares, vídeos oficiais dos cultos, devocionais diários com áudio e integração ativa dos novos convertidos."),
        ("03. Governança e Transparência", 
         "Gestão financeira segura com dízimos nominais para IRPF, inscrições de congressos com QR Code e permissões por perfil ministerial.")
    ]

    for i, (title, desc) in enumerate(pilares):
        top_pos = Inches(1.8 + i * 1.75)
        c = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_pos, Inches(11.73), Inches(1.5))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = GOLD if i == 0 else BORDER_COLOR
        c.line.width = Pt(1.5 if i == 0 else 1)
        tf = c.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = "Segoe UI"
        p.font.size = Pt(18)
        p.font.bold = True
        p.font.color.rgb = GOLD if i == 0 else WHITE
        p.space_after = Pt(6)

        p = tf.add_paragraph()
        p.text = desc
        p.font.name = "Segoe UI"
        p.font.size = Pt(13)
        p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 4: O CORAÇÃO DO APP - CHECK-IN DE ALMA & IA PASTORAL
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_background(s4)
    add_header(s4, "Check-in de Alma: Acolhimento Humanizado com Reprodução em Áudio")

    if os.path.exists(img_pastoral):
        s4.shapes.add_picture(img_pastoral, Inches(6.0), Inches(1.7), Inches(6.5), Inches(5.0))

    t4_box = s4.shapes.add_textbox(Inches(0.8), Inches(1.7), Inches(4.9), Inches(5.0))
    tf4 = t4_box.text_frame
    tf4.word_wrap = True

    pontos_s4 = [
        ("Termômetro Emocional Bíblico:", "O membro escolhe como se sente (Feliz & Grato, Cansado, Ansioso, Triste) com design respeitoso e acolhedor."),
        ("Tratamento Nominal Afetuoso:", "A IA reconhece o primeiro nome do membro (ex: 'Graça e Paz, Luan!'), oferecendo leitura sensível e pastoral."),
        ("Ouvir o Áudio a Qualquer Instante:", "O usuário pode enviar sua mensagem gravando a própria voz e ouvir a resposta e a oração geradas em voz natural brasileira a qualquer hora."),
        ("Fiel à Doutrina Cristã:", "Respostas estritamente embasadas nas Escrituras Sagradas, confortando sem frieza robótica.")
    ]

    for i, (head, body) in enumerate(pontos_s4):
        p = tf4.add_paragraph() if i > 0 else tf4.paragraphs[0]
        p.text = head
        p.font.name = "Segoe UI"
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_after = Pt(2)

        p2 = tf4.add_paragraph()
        p2.text = body
        p2.font.name = "Segoe UI"
        p2.font.size = Pt(12)
        p2.font.color.rgb = SLATE
        p2.space_after = Pt(12)

    # =========================================================================
    # SLIDE 5: DA IA AO PASTOR HUMANO - A PONTE SEGURA
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_background(s5)
    add_header(s5, "A Ponte do Cuidado: Da Inteligência Artificial ao Pastor Humano")

    steps_s5 = [
        ("Passo 1: Acolhimento Diário", "A IA atua como primeiro apoio 24/7, consolando e intercedendo pelas situações rotineiras com a Palavra."),
        ("Passo 2: Detecção de Crise", "Em casos de luto, depressão severa ou crise familiar, o sistema aciona um botão de alerta: 'Falar com o Pastor'."),
        ("Passo 3: Fila ao Vivo ou Agendamento", "Se houver pastor online no painel, o membro é atendido na hora. Caso contrário, escolhe data e horário na agenda ministerial."),
        ("Passo 4: Preparo Espiritual Prévia", "O pastor recebe o histórico e resumo prévio do motivo, entrando no gabinete presencial ou virtual já preparado em oração.")
    ]

    for i, (title, desc) in enumerate(steps_s5):
        left_pos = Inches(0.8 + (i % 2) * 6.0)
        top_pos = Inches(1.9 + (i // 2) * 2.5)
        c = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, top_pos, Inches(5.7), Inches(2.2))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = GOLD if i == 1 else BORDER_COLOR
        c.line.width = Pt(1.5 if i == 1 else 1)
        tf = c.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = "Segoe UI"
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = GOLD if i == 1 else WHITE
        p.space_after = Pt(6)

        p = tf.add_paragraph()
        p.text = desc
        p.font.name = "Segoe UI"
        p.font.size = Pt(13)
        p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 6: CÉLULAS E DISCIPULADO NOS LARES
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_background(s6)
    add_header(s6, "Células e Discipulado: A Igreja Conectada nos Lares")

    cel_data = [
        ("Mapa da Igreja nos Bairros", "Visitantes e novos decididos encontram em 1 clique a célula mais próxima de sua casa, com endereço, dia, horário e contato do líder."),
        ("Alinhamento Doutrinário Oficial", "Os líderes de célula acessam diretamente no aplicativo os estudos e esboços oficiais enviados pela liderança pastoral da igreja."),
        ("Frequência e Acompanhamento", "O líder registra os membros presentes na reunião semanal, permitindo que a liderança pastoral saiba quem está faltando antes que esfrie na fé.")
    ]

    for i, (title, desc) in enumerate(cel_data):
        top_pos = Inches(1.9 + i * 1.65)
        c = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_pos, Inches(11.73), Inches(1.4))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = BORDER_COLOR
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = "Segoe UI"
        p.font.size = Pt(17)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_after = Pt(4)

        p = tf.add_paragraph()
        p.text = desc
        p.font.name = "Segoe UI"
        p.font.size = Pt(13)
        p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 7: GESTÃO FINANCEIRA E PRESTAÇÃO DE CONTAS (IRPF)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_background(s7)
    add_header(s7, "Gestão Financeira Transparente & Comprovantes de Dízimo para IRPF")

    if os.path.exists(img_gestao):
        s7.shapes.add_picture(img_gestao, Inches(5.8), Inches(1.7), Inches(6.7), Inches(5.0))

    t7_box = s7.shapes.add_textbox(Inches(0.8), Inches(1.7), Inches(4.7), Inches(5.0))
    tf7 = t7_box.text_frame
    tf7.word_wrap = True

    pontos_s7 = [
        ("Dízimos e Ofertas Nominais:", "Rastreamento seguro via PIX, cartão e transferências bancárias com identificação individual do membro."),
        ("Comprovante Anual para IRPF:", "Gera extrato oficial com CNPJ da igreja para a declaração de Imposto de Renda dos membros de forma imediata."),
        ("Transparência com a Diretoria:", "Relatórios mensais categorizados (Missões, Aluguel, Reforma, Obras Sociais) prontos para aprovação em assembleia."),
        ("Segurança Bancária:", "Sem manipulação manual desprotegida de dinheiro em espécie na tesouraria.")
    ]

    for i, (head, body) in enumerate(pontos_s7):
        p = tf7.add_paragraph() if i > 0 else tf7.paragraphs[0]
        p.text = head
        p.font.name = "Segoe UI"
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_after = Pt(2)

        p2 = tf7.add_paragraph()
        p2.text = body
        p2.font.name = "Segoe UI"
        p2.font.size = Pt(12)
        p2.font.color.rgb = SLATE
        p2.space_after = Pt(12)

    # =========================================================================
    # SLIDE 8: EVENTOS, CONGRESSOS & INGRESSOS COM QR CODE
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_background(s8)
    add_header(s8, "Eventos e Congressos: Ingressos Digitais e Credenciamento com QR Code")

    ev_data = [
        ("Inscrições e Vendas Sem Intermediários", "Congressos de mulheres, retiros de jovens e conferências ministeriais (pagos ou gratuitos) com inscrição direta no aplicativo."),
        ("Ingresso com QR Code Único", "Cada participante recebe seu ingresso digital nominal com QR Code seguro salvo no celular, sem necessidade de papel."),
        ("Check-in na Portaria em Segundos", "Os obreiros e voluntários realizam a leitura do QR Code na entrada usando a própria câmera do celular, eliminando filas e tumultos.")
    ]

    for i, (title, desc) in enumerate(ev_data):
        top_pos = Inches(1.9 + i * 1.65)
        c = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_pos, Inches(11.73), Inches(1.4))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = BORDER_COLOR
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = "Segoe UI"
        p.font.size = Pt(17)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_after = Pt(4)

        p = tf.add_paragraph()
        p.text = desc
        p.font.name = "Segoe UI"
        p.font.size = Pt(13)
        p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 9: SEGURANÇA, HIERARQUIA & SIGILO PASTORAL
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_background(s9)
    add_header(s9, "Segurança, Governança Ministerial e Sigilo Absoluto")

    roles = [
        ("Pastor Titular / Presidente", "Visão panorâmica estratégica, aprovação de líderes e relatórios globais de engajamento da igreja."),
        ("Tesouraria & Conselho Fiscal", "Acesso exclusivo aos módulos financeiros e prestação de contas, sem acesso a dados sigilosos pastorais."),
        ("Líderes de Ministérios & Células", "Gerenciam apenas os membros e eventos do seu ministério específico (Jovens, Casais, Kids, Células)."),
        ("Membros da Congregação", "Acesso aos devocionais, células, pedidos de oração particulares e histórico dos seus próprios dízimos.")
    ]

    for i, (role, desc) in enumerate(roles):
        left_pos = Inches(0.8 + (i % 2) * 6.0)
        top_pos = Inches(1.9 + (i // 2) * 2.5)
        c = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, top_pos, Inches(5.7), Inches(2.2))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = BORDER_COLOR
        c.line.width = Pt(1)
        tf = c.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = role
        p.font.name = "Segoe UI"
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_after = Pt(6)

        p = tf.add_paragraph()
        p.text = desc
        p.font.name = "Segoe UI"
        p.font.size = Pt(13)
        p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 10: IMPLANTAÇÃO SEM TRAVAMENTO EM 7 DIAS
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    add_background(s10)
    add_header(s10, "Cronograma de Implantação Rápida em 7 Dias")

    dias = [
        ("Dias 1 e 2", "Configuração Inicial", "Inclusão da logo da congregação, cadastro dos ministérios e escala de pastores."),
        ("Dias 3 e 4", "Treinamento Pastoral", "Capacitação prática da secretaria, tesouraria e equipe pastoral no painel."),
        ("Dias 5 e 6", "Cadastro de Células", "Inserção dos pequenos grupos e da agenda oficial de cultos e eventos."),
        ("Dia 7", "Lançamento no Culto", "Apresentação com QR Code no telão do templo para toda a igreja baixar o app.")
    ]

    for i, (dia, title, desc) in enumerate(dias):
        left_pos = Inches(0.8 + i * 2.98)
        c = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(2.0), Inches(2.78), Inches(4.7))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = GOLD if i == 3 else BORDER_COLOR
        c.line.width = Pt(1.5 if i == 3 else 1)
        tf = c.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = dia
        p.font.name = "Segoe UI"
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_after = Pt(4)

        p = tf.add_paragraph()
        p.text = title
        p.font.name = "Segoe UI"
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.space_after = Pt(12)

        p = tf.add_paragraph()
        p.text = desc
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = SLATE

    # =========================================================================
    # SLIDE 11: CONCLUSÃO E PRÓXIMO PASSO
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    add_background(s11)

    c11 = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.33), Inches(5.1))
    c11.fill.solid()
    c11.fill.fore_color.rgb = CARD_BG
    c11.line.color.rgb = GOLD
    c11.line.width = Pt(2)
    tf11 = c11.text_frame
    tf11.word_wrap = True

    p = tf11.paragraphs[0]
    p.text = "A DECISÃO ESTRATÉGICA DO MINISTÉRIO"
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = GOLD
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(14)

    p = tf11.add_paragraph()
    p.text = "“Investir no Horeb não é contratar um sistema;\né fechar a porta dos fundos da igreja e cuidar com excelência\nde cada vida que Deus confiou ao seu ministério.”"
    p.font.name = "Segoe UI"
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(26)

    p = tf11.add_paragraph()
    p.text = "Próximo Passo:"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = GOLD
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(6)

    p = tf11.add_paragraph()
    p.text = "Agende uma demonstração prática de 20 minutos com a equipe pastoral e diretoria da sua igreja.\nO Horeb está pronto para transformar o cuidado com as suas ovelhas."
    p.font.name = "Segoe UI"
    p.font.size = Pt(14)
    p.font.color.rgb = SLATE
    p.alignment = PP_ALIGN.CENTER

    output_path = r"c:\Users\lynx\Documents\Horeb\Apresentacao_Horeb_Pastores.pptx"
    prs.save(output_path)
    print(f"Apresentacao salva com sucesso em: {output_path}")

if __name__ == "__main__":
    create_deck()
