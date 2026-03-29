//! Andromeda Vara Registry - Backbone Universal
//! CONTRATO MÍNIMO PARA COMPILACIÓN - Versión completa será desplegada por Ingeniero Vara

#![no_std]
#![no_main]

use core::panic::PanicInfo;

// Panic handler necesario para no_std
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

// Punto de entrada mínimo para WASM - sin allocator
#[no_mangle]
pub extern "C" fn _start() -> ! {
    loop {}
}

// Funciones requeridas por Gear/Vara (stubs)
#[no_mangle]
pub extern "C" fn init() {}

#[no_mangle]
pub extern "C" fn handle() {}

#[no_mangle]
pub extern "C" fn state() {}
