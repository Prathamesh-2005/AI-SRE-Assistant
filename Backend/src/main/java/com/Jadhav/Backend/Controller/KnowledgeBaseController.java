package com.Jadhav.Backend.Controller;

import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@CrossOrigin("http://localhost:5173/")

public class KnowledgeBaseController {

    private final VectorStore vectorStore;

    @Value("classpath:data/mysql-playbook.txt")
    private Resource playbookResource;

    public KnowledgeBaseController(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @PostMapping("/api/knowledge/ingest")
    public String ingestRealDocumentation() {
        try {
            TextReader textReader = new TextReader(playbookResource);
            textReader.getCustomMetadata().put("source", "mysql-playbook.txt");

            List<Document> documents = textReader.get();
            TokenTextSplitter splitter = TokenTextSplitter.builder().build();
            List<Document> splitDocuments = splitter.apply(documents);

            vectorStore.add(splitDocuments);

            return "Successfully chunked, embedded, and uploaded real documentation to Qdrant Cloud!";
        } catch (Exception e) {
            return "Failed to ingest data: " + e.getMessage();
        }
    }

    @PostMapping("/api/knowledge/upload")
    public String uploadDocumentation(
            @RequestBody String rawText,
            @RequestParam(defaultValue = "user-upload") String source) {
        try {
            if (rawText == null || rawText.isBlank()) {
                return "No text content provided.";
            }

            Resource resource = new ByteArrayResource(
                    rawText.getBytes(StandardCharsets.UTF_8));

            TextReader textReader = new TextReader(resource);
            textReader.getCustomMetadata().put("source", source);

            List<Document> documents = textReader.get();
            TokenTextSplitter splitter = TokenTextSplitter.builder().build();
            List<Document> splitDocuments = splitter.apply(documents);

            vectorStore.add(splitDocuments);

            return "Successfully ingested " + splitDocuments.size()
                    + " chunk(s) from source: " + source;
        } catch (Exception e) {
            return "Failed to ingest uploaded text: " + e.getMessage();
        }
    }
}