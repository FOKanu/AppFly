from jobhunt.models import Job, Requirements
from jobhunt.features.write import build_packet
from jobhunt.config import AppConfig
import pytest


def test_packet_contains_only_the_given_job() -> None:
    job = Job(
        source_id="a1",
        source="agentur",
        title="Backend Engineer",
        company="Acme",
        url="https://example.com/acme",
        location="Berlin",
        description="Work on APIs. " * 200,
    )
    other = "Frontend Designer at OtherCorp"
    packet = build_packet(
        job,
        cv_text="I build APIs.",
        samples="Dear team, I would like to apply.",
        company_note="Acme makes software.",
        requirements=Requirements(tone="plain", languages=["en"]),
        excerpt_chars=120,
    )
    assert "Backend Engineer" in packet
    assert "Acme" in packet
    assert other not in packet
    excerpt = packet.split("## Job description excerpt", 1)[1].split("## Company note", 1)[0]
    assert len(excerpt.strip()) <= 200


def test_base_url_unset_uses_default_endpoint(monkeypatch, secret_store):
    """Test that when gemini_api_base is unset, the default endpoint is used."""
    # Clear any existing env vars
    monkeypatch.delenv("GEMINI_API_BASE", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    
    # Set up a store with a key
    from jobhunt.features.secrets.keychain import MemoryKeychain
    from jobhunt.features.secrets.names import SecretName
    from jobhunt.features.secrets.store import SecretStore, reset_store
    
    store = SecretStore(MemoryKeychain())
    store.save(SecretName.gemini, "test-key")
    reset_store(store)
    
    try:
        # Mock the genai client to capture constructor arguments
        fake_client_kwargs = []
        
        class FakeClient:
            def __init__(self, **kwargs):
                fake_client_kwargs.append(kwargs)
            
            @property
            def models(self):
                class Models:
                    def generate_content(self, model, contents):
                        class Response:
                            def __init__(self):
                                self.text = "Subject: Hi\n\nDear team"
                                self.usage_metadata = type('Usage', (), {
                                    'prompt_token_count': 10,
                                    'candidates_token_count': 5
                                })()
                        return Response()
                return Models()
        
        from google import genai
        monkeypatch.setattr(genai, "Client", FakeClient)
        
        # Call the function
        from jobhunt.features.write.letters import _call_gemini
        from jobhunt.config import AppConfig
        
        config = AppConfig()
        result = _call_gemini(config, "test packet")
        
        # Verify result
        assert result == ("Subject: Hi\n\nDear team", 10, 5)
        
        # Verify client was called with correct args (no http_options)
        assert len(fake_client_kwargs) == 1
        kwargs = fake_client_kwargs[0]
        assert "api_key" in kwargs
        assert kwargs["api_key"] == "test-key"
        assert "http_options" not in kwargs
        
    finally:
        reset_store(None)


def test_base_url_from_config_is_passed_to_client(monkeypatch, secret_store):
    """Test that when gemini_api_base is set in config, it's passed to the client."""
    # Clear any existing env vars
    monkeypatch.delenv("GEMINI_API_BASE", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    
    # Set up a store with a key
    from jobhunt.features.secrets.keychain import MemoryKeychain
    from jobhunt.features.secrets.names import SecretName
    from jobhunt.features.secrets.store import SecretStore, reset_store
    
    store = SecretStore(MemoryKeychain())
    store.save(SecretName.gemini, "test-key")
    reset_store(store)
    
    try:
        # Mock the genai client to capture constructor arguments
        fake_client_kwargs = []
        
        class FakeClient:
            def __init__(self, **kwargs):
                fake_client_kwargs.append(kwargs)
            
            @property
            def models(self):
                class Models:
                    def generate_content(self, model, contents):
                        class Response:
                            def __init__(self):
                                self.text = "Subject: Hi\n\nDear team"
                                self.usage_metadata = type('Usage', (), {
                                    'prompt_token_count': 10,
                                    'candidates_token_count': 5
                                })()
                        return Response()
                return Models()
        
        from google import genai
        monkeypatch.setattr(genai, "Client", FakeClient)
        
        # Call the function with a base URL in config
        from jobhunt.features.write.letters import _call_gemini
        from jobhunt.config import AppConfig
        
        config = AppConfig(gemini_api_base="https://gateway.example.test")
        result = _call_gemini(config, "test packet")
        
        # Verify result
        assert result == ("Subject: Hi\n\nDear team", 10, 5)
        
        # Verify client was called with correct args (with http_options)
        assert len(fake_client_kwargs) == 1
        kwargs = fake_client_kwargs[0]
        assert "api_key" in kwargs
        assert kwargs["api_key"] == "test-key"
        assert "http_options" in kwargs
        assert kwargs["http_options"].base_url == "https://gateway.example.test"
        
    finally:
        reset_store(None)


def test_base_url_env_fallback(monkeypatch, secret_store):
    """Test that gemini_api_base env var fallback works."""
    # Clear any existing env vars
    monkeypatch.delenv("GEMINI_API_BASE", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    
    # Set up a store with a key
    from jobhunt.features.secrets.keychain import MemoryKeychain
    from jobhunt.features.secrets.names import SecretName
    from jobhunt.features.secrets.store import SecretStore, reset_store
    
    store = SecretStore(MemoryKeychain())
    store.save(SecretName.gemini, "test-key")
    reset_store(store)
    
    try:
        # Set env var
        monkeypatch.setenv("GEMINI_API_BASE", "https://env-gw.example.test")
        
        from jobhunt.config import AppConfig
        
        config = AppConfig()
        assert config.gemini_base_url == "https://env-gw.example.test"
        
        # Test that YAML value wins over env
        config_with_yaml = AppConfig(gemini_api_base="https://yaml.example.test")
        assert config_with_yaml.gemini_base_url == "https://yaml.example.test"
        
        # Test blank values
        config_blank = AppConfig(gemini_api_base="   ")
        assert config_blank.gemini_base_url is None
        
    finally:
        reset_store(None)


def test_load_config_parses_gemini_api_base(monkeypatch, tmp_path):
    """Test that load_config parses gemini_api_base from YAML."""
    # Clear any existing env vars
    monkeypatch.delenv("GEMINI_API_BASE", raising=False)
    
    config_content = """
vault_path: {tmp_path}/vault
gemini_api_base: https://gateway.example.test
""".format(tmp_path=tmp_path)
    
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)
    
    from jobhunt.config import load_config
    
    cfg = load_config(path=config_file)
    assert cfg.gemini_api_base == "https://gateway.example.test"
    
    # Test without the key
    config_content_no_key = """
vault_path: {tmp_path}/vault
""".format(tmp_path=tmp_path)
    
    config_file.write_text(config_content_no_key)
    cfg = load_config(path=config_file)
    assert cfg.gemini_api_base is None


def test_api_key_lookup_order(monkeypatch, secret_store):
    """Test that gemini_api_key lookup order works correctly."""
    # Clear any existing env vars
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    
    from jobhunt.features.secrets.keychain import MemoryKeychain
    from jobhunt.features.secrets.names import SecretName
    from jobhunt.features.secrets.store import SecretStore, reset_store
    
    # Test with key in store
    store = SecretStore(MemoryKeychain())
    store.save(SecretName.gemini, "from-keychain")
    reset_store(store)
    
    try:
        from jobhunt.config import AppConfig
        
        config = AppConfig()
        assert config.gemini_api_key == "from-keychain"
        
        # Test with key in env
        monkeypatch.setenv("GEMINI_API_KEY", "from-env")
        config = AppConfig()
        assert config.gemini_api_key == "from-keychain"  # Should still be from store
        
        # Delete from store, should get from env
        store.delete(SecretName.gemini)
        config = AppConfig()
        assert config.gemini_api_key == "from-env"
        
        # Clear env, should get empty string
        monkeypatch.delenv("GEMINI_API_KEY")
        config = AppConfig()
        assert config.gemini_api_key == ""
        
    finally:
        reset_store(None)


def test_missing_key_raises_clear_error(monkeypatch, secret_store):
    """Test that missing key raises a clear error message."""
    # Clear any existing env vars
    monkeypatch.delenv("GEMINI_API_BASE", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    
    from jobhunt.features.secrets.keychain import MemoryKeychain
    from jobhunt.features.secrets.names import SecretName
    from jobhunt.features.secrets.store import SecretStore, reset_store
    
    # No key in store or env
    store = SecretStore(MemoryKeychain())
    reset_store(store)
    
    try:
        # Mock the genai client to ensure it's never constructed
        fake_client_constructed = []
        
        class FakeClient:
            def __init__(self, **kwargs):
                fake_client_constructed.append(kwargs)
                raise RuntimeError("Should not be called")
            
            @property
            def models(self):
                class Models:
                    def generate_content(self, model, contents):
                        class Response:
                            def __init__(self):
                                self.text = "Subject: Hi\n\nDear team"
                                self.usage_metadata = type('Usage', (), {
                                    'prompt_token_count': 10,
                                    'candidates_token_count': 5
                                })()
                        return Response()
                return Models()
        
        from google import genai
        monkeypatch.setattr(genai, "Client", FakeClient)
        
        # Call the function with a job
        from jobhunt.features.write.letters import regenerate_letter_for_job
        from jobhunt.models import Job
        
        job = Job(
            source_id="a1",
            source="agentur",
            title="Backend Engineer",
            company="Acme",
            url="https://example.com/acme",
            location="Berlin",
            description="Work on APIs. " * 200,
        )
        
        # Should raise RuntimeError with clear message
        with pytest.raises(RuntimeError) as exc_info:
            regenerate_letter_for_job(AppConfig(), object(), job)
        
        msg = exc_info.value.args[0]
        assert "GEMINI_API_KEY" in msg
        assert "Keychain" in msg
            
        # Verify the fake client was never constructed
        assert len(fake_client_constructed) == 0
        
    finally:
        reset_store(None)
