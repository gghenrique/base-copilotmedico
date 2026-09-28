import types
import sys


def make_fake_pypdf2():
    mod = types.ModuleType("PyPDF2")

    class FakePage:
        def __init__(self, text):
            self._text = text
        def extract_text(self):
            return self._text

    class PdfReader:
        def __init__(self, stream):
            # ignore stream; produce two pages
            self.pages = [FakePage("Hello "), FakePage("World")] 

    mod.PdfReader = PdfReader
    return mod


def test_extract_text_from_pdf(monkeypatch, real_module):
    # Injeta um PyPDF2 falso ANTES de carregar o modulo real.
    monkeypatch.setitem(sys.modules, "PyPDF2", make_fake_pypdf2())
    # `real_module` tira backend.pdf_reader de tras do stub da sessao e o
    # devolve depois do teste (ver conftest.py).
    mod = real_module("backend.pdf_reader")

    class DummyUpload:
        def __init__(self):
            self.stream = object()  # just a placeholder

    result = mod.extract_text_from_pdf(DummyUpload())
    assert result == "Hello World"
