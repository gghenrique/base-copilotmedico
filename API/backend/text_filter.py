import spacy

nlp = spacy.load("pt_core_news_lg")

def remover_nomes(texto):
    doc = nlp(texto)
    nomes_para_remover = [ent.text for ent in doc.ents if ent.label_ == "PER"]
    for nome in nomes_para_remover:
        texto = texto.replace(nome, "")
    return texto.strip()


def retornar_nome(texto):
    doc = nlp(texto)
    nomes = [ent.text for ent in doc.ents if ent.label_ == "PER"]
    nome_completo = ''
    for nome in nomes:

        nome_completo = nome + '' 

    return nome_completo

def anonymize_extracted_content(content):
    """
    Aplica o anonimizador (remover_nomes) sobre o conteudo bruto capturado
    pela extensao, antes de ele ser salvo em extension_data.content.
    Suporta os 3 formatos aceitos por _normalize_extension_content:
    lista de {role, text}, dicionario chave->valor, e texto simples.
    """
    if isinstance(content, list):
        return [
            {**item, "text": remover_nomes(item["text"])}
            for item in content
        ]
    if isinstance(content, dict):
        anonymized = {}
        for key, value in content.items():
            if isinstance(value, list):
                anonymized[key] = [remover_nomes(str(v)) for v in value]
            elif isinstance(value, str):
                anonymized[key] = remover_nomes(value)
            else:
                anonymized[key] = remover_nomes(str(value))
        return anonymized
    if isinstance(content, str):
        return remover_nomes(content)
    return content


