package com.Jadhav.Backend.Config;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class DatabaseDiagnosticTools {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseDiagnosticTools(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }


    @Tool(
            name = "checkRunningQueries",
            description = "Check currently running MySQL queries. " +
                    "Use this tool first when diagnosing database performance problems. " +
                    "It returns query ID, user, database, execution time, state, and SQL query. " +
                    "Always provide the action value 'inspect'. " +
                    "Ignore sleeping connections because connection pools normally keep " +
                    "idle connections open."
    )
    public String checkRunningQueries(
            @ToolParam(
                    description = "Always use the value 'inspect'.",
                    required = true
            )
            String action) {

        try {

            String sql = """
                    SELECT
                        ID,
                        USER,
                        DB,
                        COMMAND,
                        TIME,
                        STATE,
                        INFO
                    FROM information_schema.PROCESSLIST
                    WHERE COMMAND != 'Sleep'
                      AND INFO IS NOT NULL
                      AND INFO NOT LIKE '%information_schema.PROCESSLIST%'
                      AND TIME >= 2
                    ORDER BY TIME DESC
                    """;

            List<Map<String, Object>> processes =
                    jdbcTemplate.queryForList(sql);

            if (processes.isEmpty()) {
                return "No active SQL queries running for 2 or more seconds.";
            }

            StringBuilder result = new StringBuilder();

            result.append("Long-running MySQL queries:\n\n");

            for (Map<String, Object> process : processes) {

                result.append("Connection ID: ")
                        .append(process.get("ID"))
                        .append("\n");

                result.append("User: ")
                        .append(process.get("USER"))
                        .append("\n");

                result.append("Database: ")
                        .append(process.get("DB"))
                        .append("\n");

                result.append("Command: ")
                        .append(process.get("COMMAND"))
                        .append("\n");

                result.append("Execution Time: ")
                        .append(process.get("TIME"))
                        .append(" seconds\n");

                result.append("State: ")
                        .append(process.get("STATE"))
                        .append("\n");

                result.append("SQL Query: ")
                        .append(process.get("INFO"))
                        .append("\n");

                result.append("--------------------------------\n");
            }

            return result.toString();

        } catch (Exception e) {

            return "Database monitoring failed: "
                    + e.getMessage();
        }
    }

    @Tool(
            name = "listTables",
            description = "List all tables in the current MySQL database. " +
                    "Use this when investigating the database and the user has not " +
                    "specified a particular table."
    )
    public String listTables(
            @ToolParam(
                    description = "Always use the value 'list'.",
                    required = true
            )
            String action) {

        try {

            String sql = """
                SELECT TABLE_NAME
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
                """;

            List<Map<String, Object>> tables =
                    jdbcTemplate.queryForList(sql);

            if (tables.isEmpty()) {
                return "No tables were found in the current database.";
            }

            StringBuilder result = new StringBuilder();

            result.append("Tables in the current database:\n\n");

            for (Map<String, Object> table : tables) {

                result.append("- ")
                        .append(table.get("TABLE_NAME"))
                        .append("\n");
            }

            return result.toString();

        } catch (Exception e) {

            return "Unable to list database tables: "
                    + e.getMessage();
        }
    }

    @Tool(
            name = "checkDatabaseLocks",
            description = "Check MySQL for transactions waiting for locks and identify " +
                    "the transaction blocking them. Use this tool when investigating " +
                    "blocked queries, lock waits, or deadlocks. Always use action 'inspect'."
    )
    public String checkDatabaseLocks(
            @ToolParam(
                    description = "Always use the value 'inspect'.",
                    required = true
            )
            String action) {

        try {

            String sql = """
                SELECT
                    waiting_pid,
                    waiting_account,
                    waiting_query,
                    waiting_lock_type,
                    waiting_lock_mode,
                    blocking_pid,
                    blocking_account,
                    blocking_query,
                    blocking_lock_type,
                    blocking_lock_mode
                FROM sys.innodb_lock_waits
                """;

            List<Map<String, Object>> locks =
                    jdbcTemplate.queryForList(sql);

            if (locks.isEmpty()) {
                return "No InnoDB lock waits were detected.";
            }

            StringBuilder result = new StringBuilder();

            result.append("MySQL lock waits detected:\n\n");

            for (Map<String, Object> lock : locks) {

                result.append("Waiting Process ID: ")
                        .append(lock.get("waiting_pid"))
                        .append("\n");

                result.append("Waiting Account: ")
                        .append(lock.get("waiting_account"))
                        .append("\n");

                result.append("Waiting Query: ")
                        .append(lock.get("waiting_query"))
                        .append("\n");

                result.append("Waiting Lock Type: ")
                        .append(lock.get("waiting_lock_type"))
                        .append("\n");

                result.append("Waiting Lock Mode: ")
                        .append(lock.get("waiting_lock_mode"))
                        .append("\n");

                result.append("Blocking Process ID: ")
                        .append(lock.get("blocking_pid"))
                        .append("\n");

                result.append("Blocking Account: ")
                        .append(lock.get("blocking_account"))
                        .append("\n");

                result.append("Blocking Query: ")
                        .append(lock.get("blocking_query"))
                        .append("\n");

                result.append("Blocking Lock Type: ")
                        .append(lock.get("blocking_lock_type"))
                        .append("\n");

                result.append("Blocking Lock Mode: ")
                        .append(lock.get("blocking_lock_mode"))
                        .append("\n");

                result.append("--------------------------------\n");
            }

            return result.toString();

        } catch (Exception e) {

            return "Unable to check database locks: "
                    + e.getMessage();
        }
    }


    @Tool(
            name = "explainQuery",
            description = "Run MySQL EXPLAIN on a SELECT query. " +
                    "The query must be an actual SELECT query returned by " +
                    "checkRunningQueries or explicitly provided by the user. " +
                    "Never invent a query."
    )
    public String explainQuery(
            @ToolParam(
                    description = "Exact SELECT SQL query to analyze.",
                    required = true
            )
            String query) {

        try {

            if (query == null || query.isBlank()) {
                return "No query was provided.";
            }

            query = query.trim();

            String lowerQuery = query.toLowerCase();

            if (!lowerQuery.startsWith("select ")) {
                return "Only SELECT queries can be analyzed.";
            }

            if (query.contains(";")) {
                return "Multiple SQL statements are not allowed.";
            }

            List<Map<String, Object>> result =
                    jdbcTemplate.queryForList(
                            "EXPLAIN " + query
                    );

            if (result.isEmpty()) {
                return "EXPLAIN returned no results.";
            }

            StringBuilder output = new StringBuilder();

            output.append("EXPLAIN result for:\n");
            output.append(query);
            output.append("\n\n");

            for (Map<String, Object> row : result) {
                output.append(row)
                        .append("\n");
            }

            return output.toString();

        } catch (Exception e) {

            return "EXPLAIN failed: "
                    + e.getMessage();
        }
    }

    @Tool(
            name = "getTableSchema",
            description = "Get the complete schema of a MySQL table including columns, " +
                    "data types, nullable status, default values, and indexes. " +
                    "Use this when investigating database performance."
    )
    public String getTableSchema(
            @ToolParam(
                    description = "Exact table name to inspect.",
                    required = true
            )
            String tableName) {

        try {

            if (tableName == null || tableName.isBlank()) {
                return "Table name was not provided.";
            }

            if (!tableName.matches("[a-zA-Z0-9_]+")) {
                return "Invalid table name.";
            }

            String sql = "DESCRIBE `" + tableName + "`";

            List<Map<String, Object>> schema =
                    jdbcTemplate.queryForList(sql);

            if (schema.isEmpty()) {
                return "Table not found: " + tableName;
            }

            StringBuilder result = new StringBuilder();

            result.append("Schema for table ")
                    .append(tableName)
                    .append(":\n\n");

            for (Map<String, Object> column : schema) {

                result.append("Column: ")
                        .append(column.get("Field"))
                        .append("\n");

                result.append("Type: ")
                        .append(column.get("Type"))
                        .append("\n");

                result.append("Nullable: ")
                        .append(column.get("Null"))
                        .append("\n");

                result.append("Key: ")
                        .append(column.get("Key"))
                        .append("\n");

                result.append("Default: ")
                        .append(column.get("Default"))
                        .append("\n");

                result.append("Extra: ")
                        .append(column.get("Extra"))
                        .append("\n");

                result.append("-----------------------------\n");
            }

            return result.toString();

        } catch (Exception e) {

            return "Unable to inspect table schema: "
                    + e.getMessage();
        }
    }
    @Tool(
            name = "checkTableIndexes",
            description = "Check all indexes defined on a MySQL table. " +
                    "Use this when investigating slow queries or determining " +
                    "whether columns used in WHERE clauses have indexes."
    )
    public String checkTableIndexes(
            @ToolParam(
                    description = "The exact MySQL table name to inspect.",
                    required = true
            )
            String tableName) {

        try {

            if (tableName == null || tableName.isBlank()) {
                return "Table name was not provided.";
            }

            if (!tableName.matches("[a-zA-Z0-9_]+")) {
                return "Invalid table name.";
            }

            String sql = "SHOW INDEX FROM `" + tableName + "`";

            List<Map<String, Object>> indexes =
                    jdbcTemplate.queryForList(sql);

            if (indexes.isEmpty()) {
                return "No indexes found on table: " + tableName;
            }

            StringBuilder result = new StringBuilder();

            result.append("Indexes for table ")
                    .append(tableName)
                    .append(":\n\n");

            for (Map<String, Object> index : indexes) {

                result.append("Index Name: ")
                        .append(index.get("Key_name"))
                        .append("\n");

                result.append("Column: ")
                        .append(index.get("Column_name"))
                        .append("\n");

                result.append("Non Unique: ")
                        .append(index.get("Non_unique"))
                        .append("\n");

                result.append("Index Type: ")
                        .append(index.get("Index_type"))
                        .append("\n");

                result.append("-----------------------------\n");
            }

            return result.toString();

        } catch (Exception e) {

            return "Unable to inspect indexes: "
                    + e.getMessage();
        }
    }
}