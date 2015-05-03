open System
open System.Net
open System.Text
open System.IO
 
let siteRoot = "/Users/will/paralolly"
let host = "http://localhost:8080/"
 
let listener (handler:(HttpListenerRequest->HttpListenerResponse->Async<unit>)) =
    let h = new HttpListener()
    h.Prefixes.Add host
    h.Start()
    let task = Async.FromBeginEnd(h.BeginGetContext, h.EndGetContext)
    async {
        while true do
            let! context = task
            Async.Start(handler context.Request context.Response)
    } |> Async.Start

let output (req:HttpListenerRequest) =
    let file = Path.Combine(siteRoot, Uri(host).MakeRelativeUri(req.Url).OriginalString)
    printfn "Requested : '%s'" file
    if File.Exists file then Some file
    else None

let handler (req:HttpListenerRequest) (resp:HttpListenerResponse) = async {
    resp.ContentType <- "application/json"
    match output req with
    | Some file ->
        let info = FileInfo(file)
        let data = Encoding.ASCII.GetBytes(sprintf "[\"filesize\":%d]" info.Length)
        resp.OutputStream.Write(data, 0, data.Length)
    | None -> ()
    resp.OutputStream.Close()
}

listener handler
Console.ReadLine() |> ignore
