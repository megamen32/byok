# BYOK project workload budget

Canonical checkout is server-100 `/home/roomhacker/agents-projects/byok`.
2026-10-13 measured host available RAM45,898MiB, preserve20GiB reserve and
other tenants. DNS correction unit/Node integration tests and declaration build
run one at a time in a finite systemd user scope: RAM soft384MiB/hard768MiB,
swap0,CPU100%,tasks64,IOWeight10,wall45seconds,Nodeheap384MiB.
Project dist/temp allowance32MiB/2000files, no GPU, browser, service or daemon.
Expected unit<2s, focused Node DNS integration<2s, declaration build<10s;
combined ordinary release checks have180second deadline including setup.
DNS tests must be deterministic and must not contact real providers.
