from backend.text_filter import anonymize_extracted_content as _anonymize_extracted_content

def test_anonimizar_texto_simples():
    # Testa o formato de string
    texto_bruto = "O paciente João Silva relatou dor."
    resultado = _anonymize_extracted_content(texto_bruto)
    assert "João Silva" not in resultado

def test_anonimizar_lista():
    # Testa o formato de lista vindo da extensão
    lista_bruta = [{"role": "anamnese", "text": "A Maria reclamou de febre."}]
    resultado = _anonymize_extracted_content(lista_bruta)
    assert "Maria" not in resultado[0]["text"]

def test_anonimizar_dicionario():
    # Testa o formato de dicionário
    dict_bruto = {"relato": "O Dr. Ruy Pontes atendeu o paciente."}
    resultado = _anonymize_extracted_content(dict_bruto)
    assert "Ruy Pontes" not in resultado["relato"]
