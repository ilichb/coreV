fn main() {
    println!("cargo:rerun-if-changed=src/lib.rs");
    println!("cargo:warning=Contrato Vara en modo simulación - Versión real desplegada por Ingeniero Vara");
}
