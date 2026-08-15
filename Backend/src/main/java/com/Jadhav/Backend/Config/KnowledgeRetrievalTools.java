package com.Jadhav.Backend.Config;

import org.springframework.ai.document.Document;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class KnowledgeRetrievalTools {

    private final VectorStore vectorStore;

    public KnowledgeRetrievalTools(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @Tool(
            name = "searchTroubleshootingPlaybook",
            description = "Search the SRE knowledge base and database runbooks for verified troubleshooting steps, " +
                    "past incident resolutions, and optimization guidelines. " +
                    "Use this tool whenever you find a database bottleneck, deadlock, slow query, or lock wait " +
                    "to find the approved company fix."
    )
    public String searchTroubleshootingPlaybook(
            @ToolParam(
                    description = "Key search terms describing the database issue (e.g., 'InnoDB lock wait', 'full table scan EXPLAIN')",
                    required = true
            )
            String searchKeyword) {

        try {
            List<Document> similarDocuments = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query(searchKeyword)
                            .topK(2)
                            .similarityThreshold(0.5)
                            .build()
            );

            if (similarDocuments.isEmpty()) {
                return "No matching runbook documentation found for query: " + searchKeyword;
            }

            return "Relevant Runbook / Incident Documentation:\n\n" +
                    similarDocuments.stream()
                            .map(Document::getText)
                            .collect(Collectors.joining("\n---\n"));

        } catch (Exception e) {
            return "Knowledge base search failed: " + e.getMessage();
        }
    }
}