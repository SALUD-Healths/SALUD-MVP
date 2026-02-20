import salud_health_records.aleo;
program test_salud_health_records.aleo;

function dummy:
    output true as boolean.private;

constructor:
    assert.eq edition 0u16;
