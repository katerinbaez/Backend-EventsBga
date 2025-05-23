-- Reiniciar la secuencia de RoleRequests
SELECT setval('"RoleRequests_id_seq"', (SELECT COALESCE(MAX(id), 0) + 1 FROM "RoleRequests"), false);
