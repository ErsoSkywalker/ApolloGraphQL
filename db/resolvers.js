
//Importamos Apollo Server
const { ApolloServer} = require('apollo-server');
//Importamos los modelos
const Usuario = require('../models/usuarios');
const Producto = require('../models/Producto');
const Cliente = require('../models/Clientes');
//Vamos a importar el bcrypt para por Hashear las passwords
const bcryptjs = require('bcryptjs');
//Importamos variables de entorno
require('dotenv').config({path : 'variables.env'});
//Importamos el Web Token
const jwt = require('jsonwebtoken');
//creamos funcion para generar Tokens
const crearToken = (usuario, secret, expiresIn)=>{
    const {id, email, nombre, apellido, creado} = usuario;
    return jwt.sign({id, email, nombre, apellido, creado}, secret, {expiresIn})
}

//Configuramos los Resolvers, estos tienen que estar antes en el Schema
const resolvers = {
   Query:{
       obtenerUsuario: async (_,{token}) =>{
        const user = await jwt.verify(token, process.env.SECRETA);
        return user
       },
       obtenerUsuarios: async (_, { input })=>{
           const existeUsuario = await Usuario.find();
           if(!existeUsuario[0]){throw new Error('No hay usuarios disponibles');}
           try {
               return Usuario.find();
           } catch (error) {
               console.log(error);
           }
       },
       obtenerProductos : async() =>{
           try{
                return Producto.find();
           }catch(error){
               console.log(error);
           }
       },
       obtenerProductosById : async(_,{id})=>{
            const existeProducto = await Producto.findById(id);
            if(!existeProducto){throw new Error('No hay Productos con ese Id');} 
            try {
                return existeProducto;
            } catch (error) {
                console.log(error);
            }
       },
       obtenerClientes : async()=>{
           try {
               const clientes = await Cliente.find({});
               return clientes;
           } catch (error) {
               console.log(error);
           }
       },
       obtenerClientesByVendedor : async(_, {}, ctx)=>{
           try {
               const clientes = await Cliente.find({vendedor : ctx.user.id.toString()});
               return clientes;
           } catch (error) {
               console.log(error)
           }
       },
       obtenerClientesById : async(_,{id},ctx)=>{
            
                const existeCliente = await Cliente.findById(id);
                if(!existeCliente){throw new Error('Ese cliente no existe');}
                if(ctx.user.id.toString() !== existeCliente.vendedor){throw new Error('No tienes las credenciales');}
            try {
                return existeCliente;
            } catch (error) {
                console.log(error)
            }
       }
   },
   Mutation : {
       nuevoUsuario : async (_, { input }) => {
            //Rescatamos valores de Input
            const {email, password} = input;
            const existeUsuario = await Usuario.findOne({email});
            //Validamos si existe el Usuario
            if(existeUsuario){throw new Error('Ya está registrado ese Usuario'); }
                
            const salt = await bcryptjs.genSalt(10);
            //Tomaremos el objeto de input y modificaremos solo el password
            input.password = await bcryptjs.hash(password,salt);

            try {
                //Creamos una instancia del objeto y luego le damos .save, solo para insertarlo en una nueva collection
                const usuario = new Usuario(input);
                usuario.save();
                //Nos va a regresar el usuario, ya que en el gql así lo especificamos
                return usuario;
            } catch (error) {
                console.log(error);
            }
       },
       autenticarUsuario : async(_,{input}) =>{

        const {email, password} = input;
        const existeUsuario = await Usuario.findOne({email});
        if(!existeUsuario){throw new Error('Este usuario no existe');}
        const passwordCorrecto = await bcryptjs.compare(password,existeUsuario.password);
        if(!passwordCorrecto){throw new Error('Este password es incorrecto');}
        return{
            token : crearToken(existeUsuario, process.env.SECRETA, '24h')
        }

       },
       nuevoProducto : async (_,{input})=>{
           const {nombre} = input;
           const existeUsuario = await Producto.findOne({nombre});
           if(existeUsuario){throw new Error('Ya existe un producto con ese nombre');}
           try {
               const producto = new Producto(input);
               producto.save();
               return producto;
           } catch (error) {
               console.log(error);
           }
       },
       actualizarProducto : async (_,{id, input})=>{
            const existeProducto = await Producto.findById(id);
            if(!existeProducto){throw new Error('No hay Productos con ese Id');} 

            const producto = await Producto.findByIdAndUpdate({_id : id}, input, {new : true});

            return producto;
       },
       eliminarProducto : async(_,{id})=>{
            const existeProducto = await Producto.findById(id);
            if(!existeProducto){throw new Error('No hay Productos con ese Id');} 
            await Producto.findByIdAndDelete({ _id : id });
            return "Producto Eliminado";
       },
       nuevoCliente : async (_,{ input }, ctx)=>{
           const {email} = input;
            const existeCliente = await Cliente.findOne({email});
            if(existeCliente){throw new Error('Ya existe un cliente con ese correo');}
            const cliente = new Cliente(input);
            cliente.vendedor = ctx.user.id;
            try{
                const nuevocliente = await cliente.save();
                return nuevocliente;
            }catch(error){
                console.log(error);
            }  
       },
       actualizarCliente : async(_,{ id, input} ,ctx)=>{
            const cliente = await Cliente.findById(id);
            if(!cliente){throw new Error('Ese cliente no existe en la base de datos');}
            if(ctx.user.id!==cliente.vendedor.toString()){throw new Error('No tienes las credenciales');}
            const {email} = input;
            const validarClienteEmail = await Cliente.findOne({email});
            if(validarClienteEmail.id !== id && validarClienteEmail){throw new Error('Ya existe alguien con ese email');}
            try {
                const clienteretro = await Cliente.findByIdAndUpdate({_id : id},input, {new : true} );
                return clienteretro;
            } catch (error) {
                console.log(error);
            }
        },
        eliminarCliente : async(_, {id} , ctx) => {
            const cliente = await Cliente.findById(id);
            if(!cliente){throw new Error('Ese cliente no existe en la base de datos');}
            if(ctx.user.id!==cliente.vendedor.toString()){throw new Error('No tienes las credenciales');}
            try{
                await Cliente.findOneAndDelete({_id : id});
                return "Se ha eliminado con éxito";
            }catch(error){
                console.log(error);
            }
        },
        insertarPedido : async(_, {input}, ctx)=>{
            const {cliente} = input;
            const clienteExiste = await Cliente.findById(cliente);
            if(!clienteExiste){throw new Error('Ese cliente no existe en la base de datos');}
            if(ctx.user.id!==clienteExiste.vendedor.toString()){throw new Error('No tienes las credenciales');}
            

        }
   }
}

module.exports = resolvers;