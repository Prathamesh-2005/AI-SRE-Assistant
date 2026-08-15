package com.Jadhav.Backend.Controller;

import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class KnowledgeBaseController {

    private final VectorStore vectorStore;

    // Load the text file from our resources folder
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
}