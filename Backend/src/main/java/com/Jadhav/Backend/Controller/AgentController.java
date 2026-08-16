package com.Jadhav.Backend.Controller;

import com.Jadhav.Backend.Config.DatabaseDiagnosticTools;
import com.Jadhav.Backend.Config.KnowledgeRetrievalTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class AgentController {

    private final ChatClient chatClient;

    public AgentController(
            ChatClient.Builder chatClientBuilder,
            DatabaseDiagnosticTools databaseDiagnosticTools,
            KnowledgeRetrievalTools knowledgeRetrievalTools) {

        ToolCallback[] dbTools = ToolCallbacks.from(databaseDiagnosticTools);
        ToolCallback[] ragTools = ToolCallbacks.from(knowledgeRetrievalTools);

        List<ToolCallback> allToolsList = new ArrayList<>();
        allToolsList.addAll(List.of(dbTools));
        allToolsList.addAll(List.of(ragTools));
        ToolCallback[] allTools = allToolsList.toArray(new ToolCallback[0]);

        this.chatClient = chatClientBuilder
                .defaultSystem("""
        You are a MySQL database SRE agent investigating a live incident.

        CRITICAL RULES:
        1. Call ONLY ONE tool at a time.
        2. You MUST call checkRunningQueries and checkDatabaseLocks BEFORE calling searchTroubleshootingPlaybook or writing any answer. Do not skip these.
        3. Your final report MUST quote the EXACT process IDs, table names, and SQL queries returned by the tools. If a tool returned "Blocking Process ID: 47", your report must say "process 47", not a placeholder or example number.
        4. NEVER copy example numbers or example commands from the knowledge base verbatim (e.g. do not say "KILL 4021" unless 4021 is an actual ID returned by a tool). Use the real IDs from tool output only.
        5. If checkDatabaseLocks returns no lock waits, say so explicitly instead of guessing.

        WORKFLOW:
        - First, call checkRunningQueries.
        - Second, call checkDatabaseLocks.
        - Third, call searchTroubleshootingPlaybook to find the approved fix pattern.
        - Finally, write a report that combines the REAL tool findings with the approved fix pattern — substituting real IDs/tables into the fix, not the example ones.
        """)
                .defaultTools(allTools)
                .build();
    }

    @GetMapping("/api/investigate")
    public String investigate(@RequestParam String prompt) {
        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }
}